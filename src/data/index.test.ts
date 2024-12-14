import { test, expect } from 'vitest';

import { getQuoteUniswapUSD } from '.';
import { AlchemyProvider } from 'ethers';

import dotenv from 'dotenv';
dotenv.config();

test('Get Quote on Mainnet', async () => {
  const api = process.env.API;

  const provider = new AlchemyProvider('mainnet', api);

  const tokenData = {
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    decimals: 18,
    chainId: 1,
  };

  const exchangeRateWETH = '3920.84';

  const result = await getQuoteUniswapUSD(
    tokenData,
    provider,
    exchangeRateWETH,
  );

  expect(result.fee).toBe('0.3%');
});
