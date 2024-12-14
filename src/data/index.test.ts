import { test, expect } from 'vitest';

import { getQuoteUniswapUSD, getQuoteUniswapViemUSD } from '.';
import { AlchemyProvider } from 'ethers';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

import dotenv from 'dotenv';
dotenv.config();

test('Get Quote on Mainnet', async () => {
  const api = process.env.API;

  const provider = new AlchemyProvider('mainnet', api);

  const tokenData = {
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    decimals: '18',
    chainId: 1,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapUSD(
    tokenData,
    provider,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('0.3%');
}, 6000);

test('Get Quote on Mainnet', async () => {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const tokenData = {
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    decimals: '18',
    chainId: 1,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapViemUSD(
    tokenData,
    publicClient,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('0.3%');
}, 1000000);
