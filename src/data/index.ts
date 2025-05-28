import type {
  JsonRpcProvider,
  FallbackProvider,
  AlchemyProvider,
} from 'ethers';
import { Contract } from 'ethers';
import { Token, WETH9 } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

export type ContractData = {
  address: string;
  decimals: string;
  chainId: number;
};

export type Slot0ReturnType = {
  sqrtPriceX96: bigint; // Returns a bigint representation of the sqrt price
  tick: number; // Returns the current tick (usually a number)
  observationIndex: number; // Returns the last observation index
  observationCardinality: number; // Returns the max observations that can be stored
  observationCardinalityNext: number; // Returns the next cardinality
  feeProtocol: number; // Returns the protocol fee
  unlocked: boolean; // If the pool is unlocked
};

export type Slot0RawType = [
  bigint,
  number,
  number,
  number,
  number,
  number,
  boolean,
];

// Function to get the Uniswap pool address using the WETH and Token pair
export function getPoolAddresses(chainId: number, token: Token): string[] {
  const WETH = WETH9[chainId];
  return WETH instanceof Token
    ? [
        Pool.getAddress(WETH, token, 100),
        Pool.getAddress(WETH, token, 500),
        Pool.getAddress(WETH, token, 3000),
        Pool.getAddress(WETH, token, 10000),
      ]
    : [];
}

// Function to fetch slot0 and liquidity for a given pool contract
export async function fetchPoolData(contract: Contract) {
  try {
    const [slot0, liquidity] = await Promise.all([
      contract.slot0!(),
      contract.liquidity!(),
    ]);
    return { slot0, liquidity: Number(liquidity) };
  } catch {
    return undefined;
  }
}

// Calculate adjusted price based on slot0 information.
export function calculateAdjustedPrice(
  slot0: Slot0RawType,
  addressInfo: ContractData,
  token0: string,
  WETH: Token,
  exchangeRate: string,
): number {
  const numerator = Number(slot0[0]);
  const denominator = 2n ** 96n; // Use BigInt for precision
  const price = (numerator / Number(denominator)) ** 2;
  const token0isWETH = token0 === WETH.address;
  const decimalScalar = 10 ** (18 - Number(addressInfo.decimals));
  const pricePerWETH = token0isWETH ? 1 / price : price;
  return (pricePerWETH / decimalScalar) * Number(exchangeRate);
}

export async function getBestPoolData(
  poolAddresses: string[],
  poolFees: string[],
  provider: JsonRpcProvider | AlchemyProvider | FallbackProvider,
  addressInfo: ContractData,
  WETH: Token,
  exchangeRate: string,
) {
  let bestPoolData = null;

  const poolDataPromises = poolAddresses.map(async (address) => {
    const contract = new Contract(address, IUniswapV3PoolABI.abi, provider);
    const poolData = await fetchPoolData(contract);
    if (!poolData) return null;

    const { slot0, liquidity } = poolData;
    const adjPrice = calculateAdjustedPrice(
      slot0,
      addressInfo,
      await contract.token0!(),
      WETH,
      exchangeRate,
    );

    return {
      address,
      fee: poolFees[poolAddresses.indexOf(address)],
      price: adjPrice,
      poolContract: contract,
      liquidity,
    };
  });

  const poolDataArray = await Promise.all(poolDataPromises);

  for (const data of poolDataArray) {
    if (!data) continue;

    if (!bestPoolData || data.liquidity > bestPoolData.liquidity) {
      bestPoolData = data;
    }
  }

  return bestPoolData;
}

export async function getQuoteUniswapUSD(
  addressInfo: ContractData,
  provider: JsonRpcProvider | AlchemyProvider | FallbackProvider,
  exchangeRate: string,
) {
  if (!addressInfo || !addressInfo.address || !addressInfo.decimals) {
    throw new Error('Invalid address information.');
  }
  const chainId: number = addressInfo.chainId;
  const TOKEN: Token = new Token(
    chainId,
    addressInfo.address,
    Number(addressInfo.decimals),
  );
  const WETH: Token | undefined = WETH9[chainId];

  if (!WETH) throw new Error('No WETH found');

  const poolAddresses = getPoolAddresses(chainId, TOKEN);
  if (poolAddresses.length === 0) throw new Error('No pools found');

  const poolFees = ['0.01%', '0.05%', '0.3%', '1%'];

  const bestPoolData = await getBestPoolData(
    poolAddresses,
    poolFees,
    provider,
    addressInfo,
    WETH,
    exchangeRate,
  );

  if (bestPoolData) return bestPoolData;
  throw new Error('No pool found with sufficient liquidity.');
}

export function convertSlot0(rawSlot0: Slot0RawType): Slot0ReturnType {
  return {
    sqrtPriceX96: rawSlot0[0],
    tick: rawSlot0[1],
    observationIndex: rawSlot0[2],
    observationCardinality: rawSlot0[3],
    observationCardinalityNext: rawSlot0[4],
    feeProtocol: rawSlot0[5],
    unlocked: rawSlot0[6],
  };
}

export async function getQuoteUniswapViemUSD(
  addressInfo: ContractData,
  publicClient: any,
  exchangeRate: string,
) {
  if (!addressInfo || !addressInfo.address || !addressInfo.decimals) {
    throw new Error('Invalid address information.');
  }

  const chainId = addressInfo.chainId;
  const TOKEN = new Token(
    chainId,
    addressInfo.address,
    Number(addressInfo.decimals),
  );
  const WETH = WETH9[chainId];

  if (!(WETH instanceof Token)) {
    throw new Error(
      'Failed to create Token instance. Check the address and decimals provided.',
    );
  }

  const poolAddresses = getPoolAddresses(chainId, TOKEN); // Get all pool addresses related to the token.
  const poolFees = ['0.01%', '0.05%', '0.3%', '1%']; // Example fee tiers.

  let maxLiquidity = 0;
  let bestPool: { address: string; fee: string; price: number | null } | null =
    null;

  // Iterate over all available pools
  for (let i = 0; i < poolAddresses.length; i++) {
    const poolAddress = poolAddresses[i];
    const feeTier = poolFees[i];

    try {
      const rawSlot0 = (await publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: IUniswapV3PoolABI.abi,
        functionName: 'slot0',
      })) as Slot0RawType; // Raw data from contract

      const liquidity = Number(
        await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: IUniswapV3PoolABI.abi,
          functionName: 'liquidity',
        }),
      );

      // Update the pool with the highest liquidity
      if (liquidity > maxLiquidity) {
        maxLiquidity = liquidity;

        const token0Address = await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: IUniswapV3PoolABI.abi,
          functionName: 'token0',
        });

        const adjustedPrice = calculateAdjustedPrice(
          rawSlot0, // Use rawSlot0 here
          addressInfo,
          token0Address,
          WETH,
          exchangeRate,
        );

        bestPool = {
          address: poolAddress as string,
          fee: feeTier as string,
          price: adjustedPrice,
        };
      }
    } catch (error) {
      console.error(
        `Error fetching data for pool ${poolAddress} with ${feeTier}:`,
        error,
      );
      continue; // Ignore any errors with individual pools
    }
  }

  if (bestPool) {
    return bestPool;
  }

  throw new Error('No pool found with sufficient liquidity.');
}
