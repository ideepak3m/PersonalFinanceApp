import React, { useState } from 'react';
import { Calculator, Plus, Trash2, Upload, Info, Copy } from 'lucide-react';

// CPP YMPE (Year's Maximum Pensionable Earnings) history
const YMPE_HISTORY = {
    2004: 40500, 2005: 41100, 2006: 42100, 2007: 43700, 2008: 44900,
    2009: 46300, 2010: 47200, 2011: 48300, 2012: 50100, 2013: 51100,
    2014: 52500, 2015: 53600, 2016: 54900, 2017: 55300, 2018: 55900,
    2019: 57400, 2020: 58700, 2021: 61600, 2022: 64900, 2023: 66600,
    2024: 68500, 2025: 71300
};

// Average of last 5 years YMPE for benefit calculation
const AVERAGE_YMPE_5YR = 66600; // Approximate 2024 calculation base

export const CPPContributionCalculator = ({ onCalculated, onClose }) => {
    const [contributions, setContributions] = useState([
        { year: 2024, baseContribution: '', additionalContribution: '', pensionableEarnings: '' }
    ]);
    const [pasteMode, setPasteMode] = useState(false);
    const [pasteData, setPasteData] = useState('');
    const [result, setResult] = useState(null);

    const addYear = () => {
        const lastYear = contributions.length > 0
            ? contributions[contributions.length - 1].year - 1
            : new Date().getFullYear();
        setContributions([
            ...contributions,
            { year: lastYear, baseContribution: '', additionalContribution: '', pensionableEarnings: '' }
        ]);
    };

    const removeYear = (index) => {
        setContributions(contributions.filter((_, i) => i !== index));
    };

    const updateContribution = (index, field, value) => {
        const updated = [...contributions];
        updated[index][field] = value;
        setContributions(updated);
    };

    const parsePastedData = () => {
        try {
            const lines = pasteData.trim().split('\n');
            const parsed = [];

            for (const line of lines) {
                // Try to parse lines like "2019	$2,464.17		$74.67..."
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    const yearMatch = parts[0].match(/(\d{4})/);
                    if (yearMatch) {
                        const year = parseInt(yearMatch[1]);
                        // Skip year ranges like "1989 to 2003" with $0
                        if (parts[0].includes(' to ')) continue;

                        // Parse contribution amount (remove $ and commas)
                        const baseContrib = parts[1]?.replace(/[$,]/g, '') || '0';
                        const additionalContrib = parts[2]?.replace(/[$,]/g, '') || '0';

                        // Find pensionable earnings (usually later in the row)
                        let earnings = '0';
                        for (let i = 4; i < parts.length; i++) {
                            const val = parts[i]?.replace(/[$,]/g, '').trim();
                            if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 1000) {
                                earnings = val;
                                break;
                            }
                        }

                        if (parseFloat(baseContrib) > 0 || parseFloat(earnings) > 0) {
                            parsed.push({
                                year,
                                baseContribution: parseFloat(baseContrib) || 0,
                                additionalContribution: parseFloat(additionalContrib) || 0,
                                pensionableEarnings: parseFloat(earnings) || 0
                            });
                        }
                    }
                }
            }

            if (parsed.length > 0) {
                setContributions(parsed.sort((a, b) => b.year - a.year));
                setPasteMode(false);
                setPasteData('');
            }
        } catch (err) {
            console.error('Error parsing data:', err);
        }
    };

    const calculateCPP = () => {
        // Filter valid contribution years
        const validYears = contributions.filter(c =>
            c.pensionableEarnings && parseFloat(c.pensionableEarnings) > 0
        );

        if (validYears.length === 0) {
            setResult({ error: 'Please enter at least one year of contributions' });
            return;
        }

        // Calculate adjusted pensionable earnings for each year
        const adjustedEarnings = validYears.map(c => {
            const ympe = YMPE_HISTORY[c.year] || 55000;
            const earnings = Math.min(parseFloat(c.pensionableEarnings), ympe);
            // Adjust historical earnings to current dollars using YMPE ratio
            const adjustmentFactor = AVERAGE_YMPE_5YR / ympe;
            return {
                year: c.year,
                original: earnings,
                adjusted: earnings * adjustmentFactor
            };
        });

        // CPP uses best 39 years (can drop up to 8 low-earning years for child-rearing, etc.)
        // For simplicity, we'll use all years and calculate average
        const contributoryPeriod = Math.max(validYears.length, 1);
        const maxContributoryYears = 39;

        // Average of adjusted earnings
        const totalAdjusted = adjustedEarnings.reduce((sum, e) => sum + e.adjusted, 0);
        const avgAdjustedEarnings = totalAdjusted / Math.min(contributoryPeriod, maxContributoryYears);

        // 2024 Maximum CPP at 65: $1,364.60
        // Based on average YMPE, pension = 25% of average adjusted earnings / 12
        const maxMonthlyAt65 = 1365;

        // Calculate replacement ratio (what % of max you'll get)
        const replacementRatio = Math.min(avgAdjustedEarnings / AVERAGE_YMPE_5YR, 1);

        // Estimated monthly benefit at 65
        const estimatedAt65 = Math.round(maxMonthlyAt65 * replacementRatio);
        const estimatedAt60 = Math.round(estimatedAt65 * 0.64); // 36% reduction
        const estimatedAt70 = Math.round(estimatedAt65 * 1.42); // 42% increase

        // Additional CPP (post-2019 enhanced contributions)
        const additionalContribs = validYears
            .filter(c => c.year >= 2019 && c.additionalContribution)
            .reduce((sum, c) => sum + parseFloat(c.additionalContribution || 0), 0);

        // Enhanced CPP adds roughly 33% more to the base (when fully mature)
        // For now, it's partial - estimate based on years contributed
        const enhancedYears = validYears.filter(c => c.year >= 2019).length;
        const enhancedBonus = enhancedYears > 0 ? Math.round(estimatedAt65 * 0.05 * enhancedYears) : 0;

        setResult({
            yearsContributed: validYears.length,
            totalContributions: validYears.reduce((sum, c) =>
                sum + parseFloat(c.baseContribution || 0) + parseFloat(c.additionalContribution || 0), 0
            ),
            avgAdjustedEarnings: Math.round(avgAdjustedEarnings),
            replacementRatio: Math.round(replacementRatio * 100),
            estimatedAt60,
            estimatedAt65: estimatedAt65 + enhancedBonus,
            estimatedAt70: Math.round((estimatedAt65 + enhancedBonus) * 1.42 / estimatedAt65 * estimatedAt65),
            enhancedBonus,
            disclaimer: true
        });
    };

    const applyResults = () => {
        if (result && !result.error && onCalculated) {
            onCalculated({
                cpp_years_contributed: result.yearsContributed,
                cpp_contributions_to_date: result.totalContributions,
                cpp_at_60: result.estimatedAt60,
                cpp_at_65: result.estimatedAt65,
                cpp_at_70: result.estimatedAt70
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-red-400" />
                            CPP Contribution Calculator
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-200">
                                <p className="font-medium">How to use:</p>
                                <ol className="mt-1 list-decimal list-inside space-y-1">
                                    <li>Copy the contribution table from your CPP Statement PDF</li>
                                    <li>Click "Paste from Statement" and paste the data</li>
                                    <li>Or manually enter each year's data</li>
                                    <li>Click "Calculate" to estimate your CPP benefits</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Paste Mode */}
                    {pasteMode ? (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Paste your CPP contribution data here:
                            </label>
                            <textarea
                                value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                                placeholder="Paste the contribution table from your CPP Statement..."
                                className="w-full h-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono"
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={parsePastedData}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                                >
                                    Parse Data
                                </button>
                                <button
                                    onClick={() => { setPasteMode(false); setPasteData(''); }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <button
                                onClick={() => setPasteMode(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Paste from Statement
                            </button>
                        </div>
                    )}

                    {/* Contribution Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 px-2">Year</th>
                                    <th className="text-left py-2 px-2">Base Contribution ($)</th>
                                    <th className="text-left py-2 px-2">Additional ($)</th>
                                    <th className="text-left py-2 px-2">Pensionable Earnings ($)</th>
                                    <th className="py-2 px-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {contributions.map((contrib, index) => (
                                    <tr key={index} className="border-b border-gray-700/50">
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                value={contrib.year}
                                                onChange={(e) => updateContribution(index, 'year', parseInt(e.target.value))}
                                                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                value={contrib.baseContribution}
                                                onChange={(e) => updateContribution(index, 'baseContribution', e.target.value)}
                                                placeholder="0.00"
                                                className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                value={contrib.additionalContribution}
                                                onChange={(e) => updateContribution(index, 'additionalContribution', e.target.value)}
                                                placeholder="0.00"
                                                className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                value={contrib.pensionableEarnings}
                                                onChange={(e) => updateContribution(index, 'pensionableEarnings', e.target.value)}
                                                placeholder="0.00"
                                                className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <button
                                                onClick={() => removeYear(index)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={addYear}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Year
                        </button>
                        <button
                            onClick={calculateCPP}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                            <Calculator className="w-4 h-4" />
                            Calculate CPP
                        </button>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                            {result.error ? (
                                <p className="text-red-400">{result.error}</p>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-white mb-4">Estimated CPP Benefits</h3>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-gray-800 rounded-lg p-3">
                                            <p className="text-gray-400 text-xs">Years Contributed</p>
                                            <p className="text-xl font-bold text-white">{result.yearsContributed}</p>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-3">
                                            <p className="text-gray-400 text-xs">Total Contributions</p>
                                            <p className="text-xl font-bold text-white">${result.totalContributions.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-3">
                                            <p className="text-gray-400 text-xs">Replacement Ratio</p>
                                            <p className="text-xl font-bold text-white">{result.replacementRatio}%</p>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-3">
                                            <p className="text-gray-400 text-xs">Enhanced Bonus</p>
                                            <p className="text-xl font-bold text-green-400">+${result.enhancedBonus}/mo</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
                                            <p className="text-red-300 text-sm">At Age 60</p>
                                            <p className="text-2xl font-bold text-white">${result.estimatedAt60}/mo</p>
                                            <p className="text-red-400 text-xs">36% reduction</p>
                                        </div>
                                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                                            <p className="text-green-300 text-sm">At Age 65</p>
                                            <p className="text-2xl font-bold text-white">${result.estimatedAt65}/mo</p>
                                            <p className="text-green-400 text-xs">Standard</p>
                                        </div>
                                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
                                            <p className="text-blue-300 text-sm">At Age 70</p>
                                            <p className="text-2xl font-bold text-white">${result.estimatedAt70}/mo</p>
                                            <p className="text-blue-400 text-xs">42% enhancement</p>
                                        </div>
                                    </div>

                                    {result.disclaimer && (
                                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                                            <p className="text-yellow-200 text-xs">
                                                ⚠️ <strong>Disclaimer:</strong> This is an estimate based on your contribution history.
                                                Actual CPP benefits depend on many factors including dropout provisions, child-rearing periods,
                                                and future contributions. For official estimates, refer to your CPP Statement from Service Canada.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={applyResults}
                                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Apply These Estimates to Form
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CPPContributionCalculator;
