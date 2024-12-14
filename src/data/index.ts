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
  sqrtPriceX96: BigInt; // Returns a bigint representation of the sqrt price
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

export async function getQuoteUniswapUSD(
  addressInfo: ContractData,
  provider: JsonRpcProvider | AlchemyProvider | FallbackProvider,
  exchangeRate: string,
) {
  if (addressInfo && addressInfo.address && addressInfo.decimals) {
    const chainId: number = addressInfo.chainId;

    const TOKEN: Token = new Token(
      chainId,
      addressInfo.address,
      Number(addressInfo.decimals),
    );

    const WETH: Token | undefined = WETH9[chainId];

    if (WETH instanceof Token) {
      const poolAddresses: string[] = [
        Pool.getAddress(WETH, TOKEN, 100),
        Pool.getAddress(WETH, TOKEN, 500),
        Pool.getAddress(WETH, TOKEN, 3000),
        Pool.getAddress(WETH, TOKEN, 10000),
      ];

      const poolFees: string[] = ['0.01%', '0.05%', '0.3%', '1%'];

      const poolContracts: Contract[] = poolAddresses.map(
        (address) => new Contract(address, IUniswapV3PoolABI.abi, provider),
      );

      let maxLiquidity: number = 0;
      let maxLiquidityIndex: number | undefined;
      let maxSlot0: Slot0RawType | undefined;

      for (let i = 0; i < poolContracts.length; i++) {
        let slot0: Slot0RawType;
        let liquidity = 0;

        try {
          slot0 = await poolContracts[i]?.slot0!();
          liquidity = Number(await poolContracts[i]?.liquidity!());
        } catch (error) {
          continue;
        }
        if (liquidity > maxLiquidity) {
          maxLiquidity = liquidity;
          maxLiquidityIndex = i;
          maxSlot0 = slot0;
        }
      }

      if (maxSlot0 && maxLiquidityIndex) {
        const poolContract = poolContracts[maxLiquidityIndex] as Contract;
        const numerator: number = Number(maxSlot0[0]);
        const denominator: number = 2 ** 96;

        const price: number = (numerator / denominator) ** 2;

        const token0isWETH: boolean =
          (await poolContract?.token0!()) === WETH.address;
        const decimalScalar: number = 10 ** (18 - Number(addressInfo.decimals));
        const pricePerWETH: number = token0isWETH ? 1 / price : price;
        const adjDecimalsPrice: number = pricePerWETH / decimalScalar;
        const adjPrice: number = adjDecimalsPrice * Number(exchangeRate);

        return {
          address: poolAddresses[maxLiquidityIndex] as string,
          fee: poolFees[maxLiquidityIndex] as string,
          price: adjPrice,
          poolContract: poolContract,
        };
      }
    } else {
      console.error(
        'Failed to create Token instance. Check the address and decimals provided.',
      );
    }
  }
  throw new Error('no pool found');
}

export async function getQuoteUniswapViemUSD(
  addressInfo: ContractData,
  publicClient: any,
  exchangeRate: string,
) {
  if (addressInfo && addressInfo.address && addressInfo.decimals) {
    const chainId: number = addressInfo.chainId;

    const TOKEN: Token = new Token(
      chainId,
      addressInfo.address,
      Number(addressInfo.decimals),
    );

    const WETH: Token | undefined = WETH9[chainId];

    if (WETH instanceof Token) {
      const poolAddresses: string[] = [
        Pool.getAddress(WETH, TOKEN, 100),
        Pool.getAddress(WETH, TOKEN, 500),
        Pool.getAddress(WETH, TOKEN, 3000),
        Pool.getAddress(WETH, TOKEN, 10000),
      ];

      const poolFees: string[] = ['0.01%', '0.05%', '0.3%', '1%'];

      let maxLiquidity: number = 0;
      let maxLiquidityIndex: number | undefined;
      let maxSlot0: Slot0ReturnType | undefined;

      for (let i = 0; i < poolAddresses.length; i++) {
        let slot0: Slot0ReturnType;
        let liquidity = 0;

        try {
          const rawSlot0 = (await publicClient.readContract({
            address: poolAddresses[i] as `0x${string}`,
            abi: IUniswapV3PoolABI.abi,
            functionName: 'slot0',
          })) as Slot0RawType;

          slot0 = convertSlot0(rawSlot0);

          liquidity = Number(
            await publicClient.readContract({
              address: poolAddresses[i] as `0x${string}`,
              abi: IUniswapV3PoolABI.abi,
              functionName: 'liquidity',
            }),
          );
        } catch (error) {
          continue;
        }
        if (liquidity > maxLiquidity) {
          maxLiquidity = liquidity;
          maxLiquidityIndex = i;
          maxSlot0 = slot0;
        }
      }

      if (maxSlot0 && maxLiquidityIndex) {
        const poolContract = poolAddresses[maxLiquidityIndex];
        const numerator: number = Number(maxSlot0.sqrtPriceX96);
        const denominator: number = 2 ** 96;

        const price: number = (numerator / denominator) ** 2;

        const token0 = await publicClient.readContract({
          address: poolContract as `0x${string}`,
          abi: IUniswapV3PoolABI.abi,
          functionName: 'token0',
        });
        const token0isWETH: boolean = token0 === WETH.address;
        const decimalScalar: number = 10 ** (18 - Number(addressInfo.decimals));
        const pricePerWETH: number = token0isWETH ? 1 / price : price;
        const adjDecimalsPrice: number = pricePerWETH / decimalScalar;
        const adjPrice: number = adjDecimalsPrice * Number(exchangeRate);

        return {
          address: poolAddresses[maxLiquidityIndex] as string,
          fee: poolFees[maxLiquidityIndex] as string,
          price: adjPrice,
          poolContract: poolContract as string,
        };
      }
    } else {
      console.error(
        'Failed to create Token instance. Check the address and decimals provided.',
      );
    }
  }
  throw new Error('no pool found');
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
