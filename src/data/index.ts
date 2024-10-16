import type { AddressInfo } from '@evmexplorer/blockscout';
import type { JsonRpcProvider, FallbackProvider } from 'ethers';
import { Contract } from 'ethers';
import { Token, WETH9 } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

export async function getQuoteUniswap(
  addressInfo: AddressInfo,
  chainId: number,
  provider: JsonRpcProvider | FallbackProvider,
) {
  if (
    addressInfo &&
    addressInfo.token &&
    addressInfo.token.address &&
    addressInfo.token.decimals
  ) {
    const TOKEN = new Token(
      chainId,
      addressInfo.token.address,
      Number(addressInfo.token.decimals),
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
      let maxLiquidityIndex: number = -1;
      let maxSlot0: { 0: bigint } | undefined;

      for (let i = 0; i < poolContracts.length; i++) {
        let slot0: { 0: bigint };
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

      if (maxSlot0) {
        const poolContract = poolContracts[maxLiquidityIndex] as Contract;
        const numerator: number = Number(maxSlot0[0]);
        const denominator: number = 2 ** 96;

        const price: number = (numerator / denominator) ** 2;

        const token0isWETH: boolean =
          (await poolContract?.token0!()) === WETH.address;
        const decimalScalar: number =
          10 ** (18 - Number(addressInfo.token.decimals));
        const pricePerWETH: number = token0isWETH ? 1 / price : price;
        const adjDecimalsPrice: number = pricePerWETH / decimalScalar;
        const adjPrice: number =
          adjDecimalsPrice * Number(addressInfo?.exchange_rate);

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
