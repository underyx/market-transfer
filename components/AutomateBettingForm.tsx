'use client';

import React, { useEffect, useState } from 'react';
import {getUserDataStore, getProcessedDataStore, placeBetBySlug, setProcessedDataStore, setUserDataStore, getQuestionsFromDatabase, sendQuestionsToDatabase } from '@/lib/api';
import { extractSlugFromURL, validateEntries, mapToDatabaseQuestion } from '@/lib/utils';
import LoadingButton from './LoadingButton';
import SearchManifold from './SearchManifold';
import BettingTable from './BettingTable';
import BetsDoneTextArea from './BetsDoneTextArea';
import Link from 'next/link'
import FileHandler from './FileHandler';
import ApiKeyInput from './ApiKeyInput';
import { userQuestion, frontendQuestion } from '@/lib/types';
import DatePicker from 'react-datepicker';
import {seperateData, processNewAndUpdatedData } from '../lib/probabilityCalculations';
import 'react-datepicker/dist/react-datepicker.css';

export default function SpreadsheetForm() {

    const [apiKey, setApiKey] = useState("");
    const [betsDoneData, setBetsDoneData] = useState([]);
    const [marketSlug, setMarketSlug] = useState("");
    const [prob, setMarketProb] = useState(50);
    const [userData, setUserData] = useState<userQuestion[]>([]);
    const [processedData, setProcessedData] = useState<frontendQuestion[]>([]);
    const [activeTab, setActiveTab] = useState('manifold');
    const [correctionTime, setCorrectionTime] = useState(new Date());

    const handleCorrectionTimeChange = (date) => {
        setCorrectionTime(date);
    };

    const addBetsDoneData = async (slug, outcomeToBuy, amountToPay, isSimulated: boolean = false) => {
        const nextRow = {
            slug,
            outcomeToBuy,
            amountToPay,
            isSimulated,
        }
        console.log("Adding row to bets done data", nextRow);
        setBetsDoneData(prevBetsDoneData => [...prevBetsDoneData, nextRow]);
        console.log("Bets done data", betsDoneData);
    }

    const autobet = async (amount) => {
        console.log("Autobetting", amount);
        for (let i = 0; i < amount; i = i + 100) {
            console.log("Bet at", i);

            if (!apiKey) {
                addBetsDoneData(processedData[0].slug, processedData[0].buy, 100, true);
                continue;
            }

            await placeBetBySlug(apiKey, processedData[0].slug, 100, processedData[0].buy)
                .then(async () => {
                    await addBetsDoneData(processedData[0].slug, processedData[0].buy, 100);
                    console.log("Bet placed successfully on ", processedData[0].slug, 100, processedData[0].buy);
                    //await refreshColumnAfterBet(processedData[0].slug);
                })
                .catch((error) => {
                    console.log(error)
                    alert(`Error placing bet. ${error}`);
                });
        }
    }

    const handleSearchSelect = async (market) => {
        setMarketSlug(extractSlugFromURL(market.url));
        setMarketProb(market.probability*100);
    };

    useEffect(() => {
        console.log("Getting stored data");
        const fetchData = async () => {
            let response = await getQuestionsFromDatabase();
            const results = await response.json();
            return results;
        }
        fetchData().then(data => data ? setUserData(data) : null );
        const storedApiKey = window.localStorage.getItem('manifold');

        if (storedApiKey) {
            setApiKey(storedApiKey);
        }

    }, []);

    useEffect(() => {
        console.log("userData useEffect called");
        if (!userData || userData.length === 0) {
            window.localStorage.removeItem('user-data');
            window.localStorage.removeItem('processed-data');
            setProcessedData([]);
            return;
        }
        const validatedData = validateEntries(userData);
        const seperatedData = seperateData(validatedData, processedData);
        console.log("Processing data. Modified data: ", seperatedData.modifiedData, "Unmodified data: ", seperatedData.unmodifiedData);
        processNewAndUpdatedData(seperatedData.modifiedData, seperatedData.unmodifiedData, setProcessedData);
        let databaseQuestions = [];
        for (const data of processedData) {
            databaseQuestions.push(mapToDatabaseQuestion(data));
        }
        sendQuestionsToDatabase(databaseQuestions);
    }, [userData]);

    useEffect(() => {
        window.localStorage.setItem('manifold', apiKey);

        if (apiKey) {
            setBetsDoneData(betsDoneData.filter((bet) => !bet.isSimulated));
        }

    }, [apiKey])

    const addToTable = (event) => {

        if (!processedData.map((m) => m.slug).includes(marketSlug)) {
            const updatedUserData: userQuestion[] =
                [{
                    slug: marketSlug,
                    url: null,
                    userProbability: +prob / 100,
                    correctionTime: correctionTime,
                    aggregator: "MANIFOLD",
                }
                    , ...userData];
            setUserData(updatedUserData);
        }
    }

    const handleSlugInput = (event) => {
        setMarketSlug(event.target.value)
    }

    const handleProbInput = (event) => {
        setMarketProb(event.target.value)
    }

    const handleApiChange = (key) => {
      setApiKey(key);
    }

    const handleRefreshData = async () => {
        console.log("Refreshing data");
    }

    const refreshColumnAfterBet = async (slug) => {
        console.log("Refreshing column after bet", slug);
        const updatedUserData: userQuestion[] = userData.filter((m) => m.url !== slug);
        setUserData(updatedUserData);
    }

    return (
        <div className="w-full">
            <div className="my-4 flex justify-center">
                <div className="my-4 w-1/2">
                    <div className="w-full">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'upload' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Upload Data
                                </button>
                                <button
                                    onClick={() => setActiveTab('manifold')}
                                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'manifold' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >    Manifold
                                </button>
                                <button
                                    onClick={null}
                                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'personal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >    Personal (Coming soon)
                                </button>
                                <button
                                    onClick={() => setActiveTab('autobet')}
                                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'personal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >    Autobet
                                </button>
                            </nav>
                        </div>
                        {activeTab === 'upload' && (
                            <div className="p-4">
                                <FileHandler dataToSave={userData} loadDataEndpoint={setUserData} />
                            </div>
                        )}
                        {activeTab === 'advanced' && (
                            <div className="p-4">
                                <label htmlFor="market-search" className="block text-sm font-medium text-gray-700">
                                    Search markets to autofill:
                                </label>

                                <SearchManifold handleSelect={handleSearchSelect} processedData={processedData} />

                                <label htmlFor="market_slug" className="block text-sm font-medium text-gray-700">
                                    Slug:
                                </label>

                                <input
                                    id="market_slug"
                                    name="market_slug"
                                    className="block w-full mt-1 border border-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={marketSlug}
                                    onChange={handleSlugInput}
                                />
                                <label htmlFor="market_prob" className="block text-sm font-medium text-gray-700">
                                    Probability (percentage):
                                </label>

                                <input
                                    id="market_prob"
                                    name="market_prob"
                                    className="block w-full mt-1 border border-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={prob}
                                    onChange={handleProbInput}
                                />

                                <label htmlFor="correction-time" className="block text-sm font-medium text-gray-700">
                                    User Estimate of Market Correction Time:
                                </label>

                                <DatePicker
                                    id="correction-time"
                                    name="correctionTime"
                                    selected={correctionTime}
                                    onChange={handleCorrectionTimeChange}
                                    className="block w-full mt-1 border border-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />

                                <LoadingButton passOnClick={addToTable} buttonText={"Add to table"} />
                            </div>
                        )}
                        {activeTab === 'autobet' && (

                            <LoadingButton passOnClick={() => autobet(500)} buttonText={"Autobet 500" + (apiKey ? "" : " (simulated)")} />

                        )}
                    </div>

                    <label htmlFor="api-keymanifold" className="block text-sm font-medium text-gray-700">API key (for auto betting, leave empty for simulation mode)</label>
                    <ApiKeyInput keyName="manifold" onChange={setApiKey} />

                    <LoadingButton passOnClick={handleRefreshData} buttonText={"Refresh table"} />

                    <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">Bets done{apiKey ? "" : " (simulated, add API key to clear)"}:</label>

                    <BetsDoneTextArea betsDoneData={betsDoneData} />

                    <div className='flex flex-wrap gap-2 m-2 mt-8'>
                        <Link href="https://github.com/Nathan-Tom/market-transfer" target='_blank' className="bg-green-500 hover:bg-green-700 font-bold py-2 px-4 rounded-full">GitHub Repo (Feel free to make issues)</Link>
                        <Link href="https://chat.whatsapp.com/DKKQ5wESCOHGeN5nCFVotI" target='_blank' className="bg-green-500 hover:bg-green-700 font-bold py-2 px-4 rounded-full">Say hi👋 or report bugs🐛 (whatsapp chat)</Link>
                    </div>
                </div>
            </div>
            <div className="my-4">
                <BettingTable userData={userData} tableData={processedData} setUserData={setUserData} apiKey={apiKey} addBetsDoneData={addBetsDoneData} refreshColumnAfterBet={refreshColumnAfterBet}/>
            </div>
        </div>
    );
}
