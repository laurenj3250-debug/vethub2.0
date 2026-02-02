'use client';

import React from 'react';
import { type SectionData } from './types';
import { MentationDetail } from './details/MentationDetail';
import { PostureDetail } from './details/PostureDetail';
import { GaitDetail } from './details/GaitDetail';
import { CranialNerveDetail } from './details/CranialNerveDetails';
import { ReflexDetail } from './details/ReflexDetails';
import { TonePalpationDetail } from './details/TonePalpationDetails';
import { NociceptionDetail } from './details/NociceptionDetail';

interface SectionDetailProps {
  sectionId: number;
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

export function SectionDetail({ sectionId, section, updateData }: SectionDetailProps) {
  switch (sectionId) {
    case 1:
      return <MentationDetail section={section} updateData={updateData} />;
    case 2:
      return <PostureDetail section={section} updateData={updateData} />;
    case 3:
      return <GaitDetail section={section} updateData={updateData} />;
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
      return <CranialNerveDetail sectionId={sectionId} section={section} updateData={updateData} />;
    case 12:
    case 13:
    case 14:
      return <ReflexDetail sectionId={sectionId} section={section} updateData={updateData} />;
    case 15:
    case 16:
    case 17:
      return <TonePalpationDetail sectionId={sectionId} section={section} updateData={updateData} />;
    case 18:
      return <NociceptionDetail section={section} updateData={updateData} />;
    default:
      return null;
  }
}
