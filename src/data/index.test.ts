import type { PublicClient } from 'viem';

import { test, expect } from 'vitest';

import { getQuoteUniswapUSD, getQuoteUniswapViemUSD } from '.';
import { AlchemyProvider } from 'ethers';
import { createPublicClient, http } from 'viem';
import { arbitrum, mainnet, optimism, polygon } from 'viem/chains';

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
}, 10000);

test('Get Viem Quote on Mainnet', async () => {
  const publicClient: PublicClient = createPublicClient({
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

test('Get Quote on Optimism', async () => {
  const api = process.env.API;

  const provider = new AlchemyProvider('optimism', api);

  const tokenData = {
    address: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
    decimals: '18',
    chainId: optimism.id,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapUSD(
    tokenData,
    provider,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('1%');
}, 1000000);

test('Get Quote Viem on Optimism', async () => {
  const api = process.env.API;
  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(`https://opt-mainnet.g.alchemy.com/v2/${api}`),
  });

  const tokenData = {
    address: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
    decimals: '18',
    chainId: optimism.id,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapViemUSD(
    tokenData,
    publicClient,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('1%');
}, 1000000);

test('Get Quote Viem on Polygon', async () => {
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(),
  });

  const tokenData = {
    address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
    decimals: '18',
    chainId: polygon.id,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapViemUSD(
    tokenData,
    publicClient,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('0.3%');
}, 1000000);

test('Get Quote Viem on Arbitrum', async () => {
  const publicClient = createPublicClient({
    chain: arbitrum,
    transport: http(),
  });

  const tokenData = {
    address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
    decimals: '18',
    chainId: arbitrum.id,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapViemUSD(
    tokenData,
    publicClient,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('0.05%');
}, 1000000);
