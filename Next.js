import { useState, useEffect } from "react";
import { ethers } from "ethers";
import TokenFactoryABI from "../abis/TokenFactory.json";
import UniswapRouterABI from "../abis/UniswapRouter.json";
import UniswapFactoryABI from "../abis/UniswapFactory.json";

const factoryAddress = "YOUR_FACTORY_CONTRACT_ADDRESS";
const uniswapRouterAddress = "YOUR_UNISWAP_ROUTER_ADDRESS";
const uniswapFactoryAddress = "YOUR_UNISWAP_FACTORY_ADDRESS";

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
            const _provider = new ethers.providers.Web3Provider(window.ethereum);
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

    const fetchTokens = async (contract) => {
        try {
            const tokensList = await contract.getTokens();
            setTokens(tokensList);
        } catch (error) {
            console.error("Error fetching tokens:", error);
        }
    };

    const createToken = async () => {
        if (!factoryContract) return alert("Connect Wallet First");
        if (!name.trim() || !symbol.trim() || !isValidInput(totalSupply)) return alert("Invalid token details");
        setLoading(true);
        try {
            const tx = await factoryContract.createToken(name, symbol, ethers.utils.parseUnits(totalSupply, 18));
            await tx.wait();
            fetchTokens(factoryContract);
        } catch (error) {
            setError("Error creating token");
        }
        setLoading(false);
    };

    const addLiquidity = async () => {
        if (!routerContract || !isValidAddress(tokenAddress) || !isValidInput(liquidityAmount)) return alert("Invalid inputs");
        setLoading(true);
        try {
            const tx = await routerContract.addLiquidityETH(
                tokenAddress,
                ethers.utils.parseUnits(liquidityAmount, 18),
                ethers.utils.parseUnits((liquidityAmount * 0.95).toString(), 18), // Slippage protection
                ethers.utils.parseUnits((liquidityAmount * 1.05).toString(), 18),
                signer.getAddress(),
                Math.floor(Date.now() / 1000) + 60 * 10,
                { value: ethers.utils.parseEther(liquidityAmount) }
            );
            await tx.wait();
            alert("Liquidity Added Successfully");
        } catch (error) {
            setError("Error adding liquidity");
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
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 shadow-lg rounded-lg">
                    <h2 className="text-xl font-semibold">Create Token</h2>
                    <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="border p-2 m-2 w-full" />
                    <input placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="border p-2 m-2 w-full" />
                    <input placeholder="Total Supply" type="number" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} className="border p-2 m-2 w-full" />
                    <button onClick={createToken} className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition">
                        {loading ? "Creating..." : "Create Token"}
                    </button>
                </div>
            </div>
        </div>
    );
}

