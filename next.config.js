/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose', '@solana/web3.js', 'bs58'],
  },
};

module.exports = nextConfig;
