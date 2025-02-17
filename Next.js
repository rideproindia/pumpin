import { useState, useEffect } from "react";
import { ethers } from "ethers";
import TokenFactoryABI from "../abis/TokenFactory.json";
import UniswapRouterABI from "../abis/UniswapRouter.json";
import UniswapFactoryABI from "../abis/UniswapFactory.json";

const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
const uniswapRouterAddress = process.env.NEXT_PUBLIC_ROUTER_ADDRESS;
const uniswapFactoryAddress = process.env.NEXT_PUBLIC_FACTORY_ROUTER;
const polygonRpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC;

export default function Home() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [factoryContract, setFactoryContract] = useState(null);
    const [routerContract, setRouterContract] = useState(null);
    const [factoryRouter, setFactoryRouter] = useState(null);
    const [tokens, setTokens] = useState([]);
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [totalSupply, setTotalSupply] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");
    const [swapAmount, setSwapAmount] = useState("");
    const [liquidityAmount, setLiquidityAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined" && window.ethereum) {
            const _provider = new ethers.providers.JsonRpcProvider(polygonRpcUrl);
            setProvider(_provider);
        }
    }, []);

    const isValidInput = (value) => value && !isNaN(value) && Number(value) > 0;
    const isValidAddress = (address) => ethers.utils.isAddress(address);

    const connectWallet = async () => {
        if (!provider) return alert("Install MetaMask!");
        setLoading(true);
        try {
            await provider.send("eth_requestAccounts", []);
            const _signer = provider.getSigner();
            setSigner(_signer);
            const contract = new ethers.Contract(factoryAddress, TokenFactoryABI, _signer);
            const router = new ethers.Contract(uniswapRouterAddress, UniswapRouterABI, _signer);
            const factory = new ethers.Contract(uniswapFactoryAddress, UniswapFactoryABI, _signer);
            setFactoryContract(contract);
            setRouterContract(router);
            setFactoryRouter(factory);
            fetchTokens(contract);
        } catch (err) {
            setError("Failed to connect wallet");
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
            <div className="bg-white shadow-lg rounded-lg p-6">
                <h1 className="text-2xl font-bold text-center mb-4">Token Creator & Liquidity Manager</h1>
                <button onClick={connectWallet} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">
                    {loading ? "Connecting..." : "Connect Wallet"}
                </button>
                {error && <p className="text-red-500 text-center mt-2">{error}</p>}
            </div>
        </div>
    );
}

