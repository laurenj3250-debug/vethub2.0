'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Copy, Search, ArrowLeft, FileText, Brain, Bone } from 'lucide-react';
import neurologicalConditions from '@/lib/mri-data/conditions';
import { NeurologicalCondition, ReportCustomization, Severity, Laterality } from '@/lib/mri-data/types';
import { generateFullReport, formatReportForCopy } from '@/lib/mri-data/utils';

export default function MRIBuilderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Brain' | 'Spine'>('All');
  const [selectedCondition, setSelectedCondition] = useState<NeurologicalCondition | null>(null);
  const [customization, setCustomization] = useState<ReportCustomization>({
    selectedCondition: null,
    selectedLocation: '',
    selectedSeverity: 'Moderate',
    selectedLaterality: 'Bilateral',
    selectedVariants: [],
    clinicalHistory: '',
    additionalFindings: '',
    customImpression: '',
  });

  // Filter conditions
  const filteredConditions = useMemo(() => {
    return neurologicalConditions.filter(condition => {
      const matchesSearch = condition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        condition.subcategory.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || condition.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Generate report
  const generatedReport = useMemo(() => {
    if (!selectedCondition) return null;
    return generateFullReport(selectedCondition, customization);
  }, [selectedCondition, customization]);

  const handleConditionSelect = (condition: NeurologicalCondition) => {
    setSelectedCondition(condition);
    setCustomization(prev => ({
      ...prev,
      selectedCondition: condition,
      selectedLocation: condition.finding.location[0] || '',
    }));
  };

  const handleCopyReport = () => {
    if (generatedReport) {
      const formatted = formatReportForCopy(generatedReport);
      navigator.clipboard.writeText(formatted);
      alert('Report copied to clipboard!');
    }
  };

  const brainCount = neurologicalConditions.filter(c => c.category === 'Brain').length;
  const spineCount = neurologicalConditions.filter(c => c.category === 'Spine').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <ArrowLeft size={16} />
                Back to Patients
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">MRI Report Builder</h1>
              <FileText className="text-purple-600" size={24} />
            </div>
            <div className="text-xs text-gray-600">
              {neurologicalConditions.length} Conditions Available
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Condition Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 sticky top-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Select Condition</h2>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search conditions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg transition ${
                    selectedCategory === 'All'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({neurologicalConditions.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('Brain')}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg transition flex items-center justify-center gap-1 ${
                    selectedCategory === 'Brain'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Brain size={14} />
                  Brain ({brainCount})
                </button>
                <button
                  onClick={() => setSelectedCategory('Spine')}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg transition flex items-center justify-center gap-1 ${
                    selectedCategory === 'Spine'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Bone size={14} />
                  Spine ({spineCount})
                </button>
              </div>

              {/* Conditions List */}
              <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredConditions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No conditions found</p>
                ) : (
                  filteredConditions.map((condition) => (
                    <button
                      key={condition.id}
                      onClick={() => handleConditionSelect(condition)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedCondition?.id === condition.id
                          ? 'bg-purple-100 border-2 border-purple-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-900">{condition.name}</div>
                      <div className="text-xs text-gray-600">
                        <span className={condition.category === 'Brain' ? 'text-blue-600' : 'text-green-600'}>
                          {condition.category}
                        </span>
                        {' · '}
                        {condition.subcategory}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Customization Panel */}
              {selectedCondition && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <h3 className="font-bold text-sm text-gray-800">Customize</h3>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
                    <select
                      value={customization.selectedLocation}
                      onChange={(e) => setCustomization(prev => ({ ...prev, selectedLocation: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border rounded-lg"
                    >
                      {selectedCondition.finding.location.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Severity</label>
                    <select
                      value={customization.selectedSeverity}
                      onChange={(e) => setCustomization(prev => ({ ...prev, selectedSeverity: e.target.value as Severity }))}
                      className="w-full px-2 py-1 text-xs border rounded-lg"
                    >
                      <option value="Mild">Mild</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>

                  {/* Laterality */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Laterality</label>
                    <select
                      value={customization.selectedLaterality}
                      onChange={(e) => setCustomization(prev => ({ ...prev, selectedLaterality: e.target.value as Laterality }))}
                      className="w-full px-2 py-1 text-xs border rounded-lg"
                    >
                      <option value="Left">Left</option>
                      <option value="Right">Right</option>
                      <option value="Bilateral">Bilateral</option>
                      <option value="Midline">Midline</option>
                    </select>
                  </div>

                  {/* Variants */}
                  {selectedCondition.variants && selectedCondition.variants.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Variants</label>
                      {selectedCondition.variants.map(variant => (
                        <label key={variant.id} className="flex items-center gap-2 text-xs mb-1">
                          <input
                            type="checkbox"
                            checked={customization.selectedVariants.includes(variant.id)}
                            onChange={(e) => {
                              setCustomization(prev => ({
                                ...prev,
                                selectedVariants: e.target.checked
                                  ? [...prev.selectedVariants, variant.id]
                                  : prev.selectedVariants.filter(id => id !== variant.id)
                              }));
                            }}
                            className="rounded"
                          />
                          <span>{variant.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Report Preview */}
          <div className="lg:col-span-2">
            {selectedCondition && generatedReport ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Generated MRI Report</h2>
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <Copy size={16} />
                    Copy Report
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Clinical History */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-800 mb-2">CLINICAL HISTORY</h3>
                    <textarea
                      value={customization.clinicalHistory}
                      onChange={(e) => setCustomization(prev => ({ ...prev, clinicalHistory: e.target.value }))}
                      placeholder="Enter clinical history..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Technique */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-800 mb-2">TECHNIQUE</h3>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-line">
                      {generatedReport.technique}
                    </div>
                  </div>

                  {/* Findings */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-800 mb-2">FINDINGS</h3>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-line">
                      {generatedReport.findings}
                    </div>
                    <textarea
                      value={customization.additionalFindings}
                      onChange={(e) => setCustomization(prev => ({ ...prev, additionalFindings: e.target.value }))}
                      placeholder="Add additional findings..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border rounded-lg mt-2 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Impression */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-800 mb-2">IMPRESSION</h3>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-line">
                      {generatedReport.impression}
                    </div>
                    <textarea
                      value={customization.customImpression}
                      onChange={(e) => setCustomization(prev => ({ ...prev, customImpression: e.target.value }))}
                      placeholder="Add custom notes to impression..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border rounded-lg mt-2 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-800 mb-2">RECOMMENDATIONS</h3>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-line">
                      {generatedReport.recommendations}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <FileText className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Condition Selected</h3>
                <p className="text-sm text-gray-500">Select a condition from the left to generate an MRI report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
