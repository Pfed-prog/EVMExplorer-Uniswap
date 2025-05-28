# EVMExplorer-Uniswap

[EVM Explorer](https://evmexplorer.com) TypeScript Uniswap v3 SDK.

## 📦 Install

```bash
npm install @evmexplorer/uniswap
```

or

```bash
yarn add @evmexplorer/uniswap
```

## 🚀 Features

- Fetch USD price quotes for various tokens on Uniswap V3.
- Easily integrated with Ethers.js for Ethereum network interactions.
- Simple TypeScript API with clear typings for improved developer experience.

## Example usage

To get a quote of [AAVE token](https://evmexplorer.com/contracts/mainnet/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9) price in USD from Uniswap V3:

```ts
import { getQuoteUniswapUSD } from '@evmexplorer/uniswap';
import { AlchemyProvider } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const api = process.env.API;
const provider = new AlchemyProvider('mainnet', api);

const tokenData = {
  address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  decimals: 18,
  chainId: 1,
};

const exchangeRateWETH = '3920.84';

const result = await getQuoteUniswapUSD(tokenData, provider, exchangeRateWETH);
```

### 🌿 Notes

- Ensure you have an Alchemy API key, which can be obtained by signing up on the Alchemy website.
- Update the `exchangeRateWETH` variable with the current price for accurate results. This can be sourced dynamically from price feeds or exchanges.

## More information

[EVM Explorer - Tracking Smart Contract Transaction Data](https://dspyt.com/evmexplorer)

[Understanding Slot0 Data](https://stackoverflow.com/a/79280489/13943679)
