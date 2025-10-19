'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, LayoutGrid, ListTodo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type HeaderProps = {
  patientCount: number;
  hasMriPatient: boolean;
  onExportRounding: () => void;
  onExportMri: () => void;
  showMorningOverview: boolean;
  setShowMorningOverview: (show: boolean) => void;
};

const Header: React.FC<HeaderProps> = ({ 
  patientCount, 
  hasMriPatient, 
  onExportRounding, 
  onExportMri,
  showMorningOverview,
  setShowMorningOverview
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
