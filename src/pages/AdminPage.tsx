import type React from 'react';
import { Route, Routes } from 'react-router-dom';
import Chart from '@/components/dataComponents/chart';
import { PageContainer } from '@/components/ui/page-container';

const AdminHome: React.FC = () => {
  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="alert alert-info mb-4">
        <span>Charts framework - TODO: Implement data visualization</span>
      </div>
      {/* TODO: Add charts with real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Sample Chart</h2>
            <p className="text-sm opacity-70">Chart component TODO: Implement data visualization</p>
            {/* Example chart - replace with real data */}
            <Chart
              type="bar"
              data={{
                labels: ['Placeholder'],
                datasets: [
                  {
                    label: 'Sample',
                    data: [0],
                    backgroundColor: 'rgba(52, 121, 55, 0.5)',
                  },
                ],
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'TODO: Add real data',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <Routes>
        <Route path="/" element={<AdminHome />} />
      </Routes>
    </div>
  );
};

export default AdminPage;
