import { IntegrationSync } from '@/components/IntegrationSync';

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">External Integrations</h1>
          <p className="text-gray-400">
            Connect VetHub with EzyVet and VetRadar to import patient data and treatment sheets
          </p>
        </div>

        <IntegrationSync />
      </div>
    </div>
  );
}
