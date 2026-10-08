'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
    const [platformAddress, setPlatformAddress] = useState('');
    const [balance, setBalance] = useState('0.000000');
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [loadingBalance, setLoadingBalance] = useState(false);

    // Deposit Form State
    const [depositMemo, setDepositMemo] = useState('');
    const [depositAmount, setDepositAmount] = useState('0.1');
    const [depositLoading, setDepositLoading] = useState(false);

    // Withdraw Form State
    const [withdrawToAddress, setWithdrawToAddress] = useState('');
    const [withdrawMemo, setWithdrawMemo] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    // Withdraw List State
    const [withdrawals, setWithdrawals] = useState([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

    // Decode Tx State
    const [decodeSignature, setDecodeSignature] = useState('');
    const [decodeLoading, setDecodeLoading] = useState(false);
    const [decodedResult, setDecodedResult] = useState(null);

    // Notification Toast
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    // Generate Random Unique Memo
    const handleGenerateRandomMemo = () => {
        const randomArray = new Uint32Array(1);

        crypto.getRandomValues(randomArray);

        const newMemo = (
            10000000 + (randomArray[0] % 90000000)
        ).toString();

        setDepositMemo(newMemo);
        setWithdrawMemo(newMemo);
    };

    // Fetch / Generate Platform Address
    const fetchAddress = async (force = false) => {
        try {
            setLoadingAddress(true);
            const url = force ? '/api/deposit/generate-address' : '/api/deposit/address';
            const method = force ? 'POST' : 'GET';
            const res = await fetch(url, { method });
            const data = await res.json();

            if (data.success && data.address) {
                setPlatformAddress(data.address);
                if (force) {
                    showToast('Generated new platform deposit address!', 'success');
                    fetchBalance();
                };
            } else {
                if (data.message) showToast(data.message, 'warning');
            };
        } catch (err) {
            showToast('Error fetching address: ' + err.message, 'error');
        } finally {
            setLoadingAddress(false);
        };
    };

    // Fetch Platform Balance
    const fetchBalance = async () => {
        try {
            setLoadingBalance(true);
            const res = await fetch('/api/deposit/balance');
            const data = await res.json();

            if (data.success) {
                setBalance(data.balance !== undefined ? data.balance : '0.000000');
            } else {
                showToast(data.message || 'Failed to fetch balance', 'error');
            };
        } catch (err) {
            showToast('Error fetching balance: ' + err.message, 'error');
        } finally {
            setLoadingBalance(false);
        };
    };

    // Fetch Withdrawals List
    const fetchWithdrawals = async () => {
        try {
            setLoadingWithdrawals(true);
            const res = await fetch('/api/withdraw/list');
            const data = await res.json();

            if (data.success) {
                setWithdrawals(data.withdrawals || []);
            };
        } catch (err) {
            console.error('Fetch withdrawals error:', err);
        } finally {
            setLoadingWithdrawals(false);
        };
    };

    useEffect(() => {
        fetchAddress();
        fetchBalance();
        fetchWithdrawals();
    }, []);

    // Submit Deposit
    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        if (!depositMemo || !depositAmount) {
            showToast('Please fill in both memo and amount.', 'error');
            return;
        };

        setDepositLoading(true);
        try {
            const res = await fetch('/api/deposit/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memo: depositMemo,
                    amount: parseFloat(depositAmount),
                }),
            });
            const data = await res.json();

            if (data.success) {
                showToast(data.message || 'Deposit executed & verified successfully!', 'success');
                fetchBalance();
            } else {
                showToast(data.message || 'Deposit failed', 'error');
            };
        } catch (err) {
            showToast('Deposit error: ' + err.message, 'error');
        } finally {
            setDepositLoading(false);
        };
    };

    // Submit Withdraw
    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        if (!withdrawToAddress || !withdrawMemo || !withdrawAmount) {
            showToast('Please fill in all withdrawal fields.', 'error');
            return;
        };

        setWithdrawLoading(true);
        try {
            const res = await fetch('/api/withdraw/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toAddress: withdrawToAddress,
                    memo: withdrawMemo,
                    amount: parseFloat(withdrawAmount),
                }),
            });
            const data = await res.json();

            if (data.success) {
                showToast(data.message || 'Withdrawal completed successfully!', 'success');
                setWithdrawToAddress('');
                setWithdrawMemo('');
                setWithdrawAmount('');
                fetchBalance();
                fetchWithdrawals();
            } else {
                showToast(data.message || 'Withdrawal failed', 'error');
            };
        } catch (err) {
            showToast('Withdrawal error: ' + err.message, 'error');
        } finally {
            setWithdrawLoading(false);
        };
    };

    // Submit Decode Tx
    const handleDecodeSubmit = async (e) => {
        e.preventDefault();
        if (!decodeSignature) {
            showToast('Please enter a valid Transaction Signature.', 'error');
            return;
        };

        setDecodeLoading(true);
        setDecodedResult(null);

        try {
            const res = await fetch('/api/transaction/decode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature: decodeSignature }),
            });
            const data = await res.json();
            setDecodedResult(data);

            if (data.success) {
                showToast('Transaction decoded successfully!', 'success');
            } else {
                showToast(data.message || 'Failed to decode transaction', 'error');
            };
        } catch (err) {
            showToast('Decode error: ' + err.message, 'error');
        } finally {
            setDecodeLoading(false);
        };
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans pb-12">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${toast.type === 'success'
                        ? 'bg-emerald-600 text-white'
                        : toast.type === 'error'
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                >
                    {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Top Header Logo Bar */}
                <div className="flex items-center space-x-2">
                    <div className="bg-[#6366f1] text-white px-2.5 py-1 rounded-md font-extrabold text-xs tracking-wider uppercase">
                        SOL
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">
                        Solana Deposit & Withdrawal System
                    </h1>
                </div>

                {/* Top Controls Row: Generate Address (Left) & Balance Box (Right) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => fetchAddress(true)}
                            disabled={loadingAddress}
                            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow-sm flex items-center space-x-2 transition disabled:opacity-60"
                        >
                            <span>📱</span>
                            <span>{loadingAddress ? 'Generating Address...' : 'Generate Address'}</span>
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 px-4 shadow-sm flex items-center space-x-4">
                        <button
                            onClick={fetchBalance}
                            disabled={loadingBalance}
                            className="border border-blue-500 text-blue-600 hover:bg-blue-50 font-medium px-3 py-1.5 rounded-md text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                        >
                            <span>🔄</span>
                            <span>{loadingBalance ? 'Loading...' : 'Get Balance'}</span>
                        </button>

                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                PLATFORM WALLET BALANCE
                            </div>
                            <div className="text-base font-extrabold text-slate-900 font-mono">
                                {balance} <span className="text-xs font-semibold text-slate-600">SOL</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2-Column Grid: Deposit System (Left) & Withdraw System (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Deposit System Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
                            <span>📥</span>
                            <span>Deposit System</span>
                        </div>

                        <form onSubmit={handleDepositSubmit} className="space-y-4">
                            {/* Field 1: Deposit SOL Address */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    # DEPOSIT SOL ADDRESS
                                </label>
                                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                                    <span className="text-xs font-mono text-slate-700 truncate flex-1 px-1">
                                        {platformAddress || 'Fetching address...'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(platformAddress)}
                                        disabled={!platformAddress}
                                        className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded transition flex items-center space-x-1"
                                    >
                                        <span>📋</span>
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Field 2: Memo */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Memo <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex-1">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                                            ✏️
                                        </span>
                                        <input
                                            type="text"
                                            value={depositMemo}
                                            onChange={(e) => setDepositMemo(e.target.value)}
                                            required
                                            placeholder="Generate memo"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateRandomMemo}
                                        className="border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-medium px-3 py-2 rounded-md transition flex items-center space-x-1 whitespace-nowrap"
                                    >
                                        <span>⚡</span>
                                        <span>Generate Memo</span>
                                    </button>
                                </div>
                            </div>

                            {/* Field 3: Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Amount <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                                    <span className="bg-blue-50 text-blue-600 font-semibold text-xs px-3 py-2 border-r border-slate-300">
                                        SOL
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.000000001"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        required
                                        placeholder="0"
                                        className="flex-1 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Submit Deposit Button */}
                            <button
                                type="submit"
                                disabled={depositLoading}
                                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-2.5 rounded-lg text-sm shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
                            >
                                <span>✈️</span>
                                <span>{depositLoading ? 'Processing Deposit...' : 'Deposit'}</span>
                            </button>
                        </form>
                    </div>

                    {/* Withdraw System Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
                            <span>📤</span>
                            <span>Withdraw</span>
                        </div>

                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            {/* Field 1: To Address */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    To Address <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                                        📁
                                    </span>
                                    <input
                                        type="text"
                                        value={withdrawToAddress}
                                        onChange={(e) => setWithdrawToAddress(e.target.value)}
                                        required
                                        placeholder="Paste recipient Solana wallet address"
                                        className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Field 2: Memo */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Memo <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex-1">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                                            📝
                                        </span>
                                        <input
                                            type="text"
                                            value={withdrawMemo}
                                            onChange={(e) => setWithdrawMemo(e.target.value)}
                                            required
                                            placeholder="Generate memo"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateRandomMemo}
                                        className="border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-medium px-3 py-2 rounded-md transition flex items-center space-x-1 whitespace-nowrap"
                                    >
                                        <span>⚡</span>
                                        <span>Generate Memo</span>
                                    </button>
                                </div>
                            </div>

                            {/* Field 3: Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Amount <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                                    <span className="bg-blue-50 text-blue-600 font-semibold text-xs px-3 py-2 border-r border-slate-300">
                                        SOL
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.000000001"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        required
                                        placeholder="Enter withdraw amount (e.g. 0.05)"
                                        className="flex-1 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Submit Withdraw Button */}
                            <button
                                type="submit"
                                disabled={withdrawLoading}
                                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-2.5 rounded-lg text-sm shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
                            >
                                <span>✈️</span>
                                <span>{withdrawLoading ? 'Processing Withdrawal...' : 'Withdraw'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Withdraw List Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                            <span>📋</span>
                            <span>Withdraw List</span>
                        </div>
                        <button
                            onClick={fetchWithdrawals}
                            disabled={loadingWithdrawals}
                            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-md transition flex items-center space-x-1"
                        >
                            <span>🔄</span>
                            <span>{loadingWithdrawals ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="p-3">TRANSACTION HASH (EXPLORER URL)</th>
                                    <th className="p-3">CREATED DATE</th>
                                    <th className="p-3 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                                {loadingWithdrawals ? (
                                    <tr>
                                        <td colSpan="3" className="p-4 text-center text-slate-400">
                                            Loading withdrawal history...
                                        </td>
                                    </tr>
                                ) : withdrawals.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="p-4 text-center text-slate-400">
                                            No withdrawal transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    withdrawals.map((item) => (
                                        <tr key={item._id || item.withdrawId} className="hover:bg-slate-50/80">
                                            <td className="p-3">
                                                {item.transactionSignature ? (
                                                    <a
                                                        href={`https://explorer.solana.com/tx/${item.transactionSignature}?cluster=devnet`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-600 hover:underline truncate inline-block max-w-[350px] sm:max-w-[500px]"
                                                    >
                                                        {item.transactionSignature}
                                                    </a>
                                                ) : (
                                                    <span className="text-amber-600 font-sans font-semibold">Pending Signature</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-600 font-sans">
                                                {formatDate(item.createdAt || item.confirmedAt)}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    {item.transactionSignature && (
                                                        <>
                                                            <button
                                                                onClick={() => copyToClipboard(item.transactionSignature)}
                                                                className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 text-slate-600 transition"
                                                                title="Copy Hash"
                                                            >
                                                                📋
                                                            </button>
                                                            <a
                                                                href={`https://explorer.solana.com/tx/${item.transactionSignature}?cluster=devnet`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 text-slate-600 transition inline-block"
                                                                title="Open in Explorer"
                                                            >
                                                                ↗️
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Decode Transaction Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
                        <span>&lt;/&gt;</span>
                        <span>Decode Transaction</span>
                    </div>

                    <form onSubmit={handleDecodeSubmit} className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700">
                            Transaction Id (Signature)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={decodeSignature}
                                onChange={(e) => setDecodeSignature(e.target.value)}
                                placeholder="Paste Transaction Signature / ID here"
                                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <button
                                type="submit"
                                disabled={decodeLoading}
                                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium px-6 py-2 rounded-md text-xs shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-60"
                            >
                                <span>🔍</span>
                                <span>{decodeLoading ? 'Decoding...' : 'Decode'}</span>
                            </button>
                        </div>
                    </form>

                    {/* Formatted JSON Display */}
                    {decodedResult && (
                        <div className="mt-4 p-4 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-auto max-h-[400px] border border-slate-800">
                            <pre>{JSON.stringify(decodedResult, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};