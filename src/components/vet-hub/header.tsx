'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, LayoutGrid, ListTodo, Minimize2, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type HeaderProps = {
  patientCount: number;
  hasMriPatient: boolean;
  onExportRounding: () => void;
  onExportMri: () => void;
  showMorningOverview: boolean;
  setShowMorningOverview: (show: boolean) => void;
  onToggleAllCollapse: (collapse: boolean) => void;
};

const Header: React.FC<HeaderProps> = ({ 
  patientCount, 
  hasMriPatient, 
  onExportRounding, 
  onExportMri,
  showMorningOverview,
  setShowMorningOverview,
  onToggleAllCollapse
}) => {
  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
          <div>
            <CardTitle className="text-3xl font-bold text-gray-800">VetCare Hub</CardTitle>
            <CardDescription className="mt-1">Track tasks and prepare rounding sheets with ease.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            {patientCount > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onToggleAllCollapse(true)}
                >
                  <Minimize2 />
                  Collapse All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onToggleAllCollapse(false)}
                >
                  <Maximize2 />
                  Expand All
                </Button>
                <Button
                  variant={showMorningOverview ? "secondary" : "outline"}
                  onClick={() => setShowMorningOverview(!showMorningOverview)}
                >
                  {showMorningOverview ? <LayoutGrid /> : <ListTodo />}
                  {showMorningOverview ? 'Hide Overview' : 'Show Task Overview'}
                </Button>
                {hasMriPatient && (
                  <Button onClick={onExportMri}>
                    <Download />
                    Export MRI Sheet
                  </Button>
                )}
                <Button onClick={onExportRounding}>
                  <Download />
                  Export Rounding Sheet
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default Header;
