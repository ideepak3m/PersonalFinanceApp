import React from 'react';

const InsuranceSummaryCards = ({ summary, formatCurrency }) => {
    if (!summary) return null;

    return (
        <div className="space-y-6 mb-6">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Active Policies</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.totalPolicies}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Sum Assured</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalSumAssured)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Annual Premium</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalAnnualPremium)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Premiums Paid</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalPremiumsPaid)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Accrued Bonus */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
                    <p className="text-sm text-green-700">Total Accrued Bonus</p>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(summary.totalAccruedBonus)}</p>
                </div>

                {/* Expected Maturity */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                    <p className="text-sm text-blue-700">Expected Maturity Value</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(summary.totalExpectedMaturity)}</p>
                </div>

                {/* Upcoming Premiums */}
                <div className={`rounded-lg border p-4 ${summary.upcomingPremiums?.length > 0
                        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                    <p className={`text-sm ${summary.upcomingPremiums?.length > 0 ? 'text-orange-700' : 'text-gray-600'}`}>
                        Premiums Due (Next 30 Days)
                    </p>
                    <p className={`text-2xl font-bold ${summary.upcomingPremiums?.length > 0 ? 'text-orange-800' : 'text-gray-800'}`}>
                        {summary.upcomingPremiums?.length || 0} policies
                    </p>
                </div>
            </div>

            {/* Upcoming Premiums Alert */}
            {summary.upcomingPremiums?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Upcoming Premium Due Dates
                    </h4>
                    <div className="space-y-2">
                        {summary.upcomingPremiums.map((item, index) => (
                            <div key={index} className="flex justify-between items-center bg-white rounded px-3 py-2">
                                <div>
                                    <p className="font-medium text-gray-900">{item.insurer}</p>
                                    <p className="text-sm text-gray-500">{item.policyNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-orange-700">
                                        {new Date(item.dueDate).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short'
                                        })}
                                    </p>
                                    <p className="text-sm text-gray-600">{formatCurrency(item.amount)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* By Plan Type */}
                {Object.keys(summary.byPlanType).length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <h4 className="font-medium text-gray-900 mb-3">By Plan Type</h4>
                        <div className="space-y-2">
                            {Object.entries(summary.byPlanType).map(([type, data]) => {
                                const percentage = (data.sumAssured / summary.totalSumAssured) * 100;
                                return (
                                    <div key={type}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="capitalize">{type.replace('_', ' ')}</span>
                                            <span className="text-gray-500">
                                                {data.count} policies • {formatCurrency(data.sumAssured)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* By Insurer */}
                {Object.keys(summary.byInsurer).length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <h4 className="font-medium text-gray-900 mb-3">By Insurer</h4>
                        <div className="space-y-2">
                            {Object.entries(summary.byInsurer).map(([insurer, data]) => {
                                const percentage = (data.sumAssured / summary.totalSumAssured) * 100;
                                return (
                                    <div key={insurer}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{insurer}</span>
                                            <span className="text-gray-500">
                                                {data.count} policies • {formatCurrency(data.sumAssured)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsuranceSummaryCards;
