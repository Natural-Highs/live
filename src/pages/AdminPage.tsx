import React from 'react';
import { Routes, Route } from 'react-router-dom';

const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <Routes>
        <Route path="/" element={<div>Admin Home - To be implemented</div>} />
      </Routes>
    </div>
  );
};

export default AdminPage;
