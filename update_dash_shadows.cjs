const fs = require('fs');

let r = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// replace "bg-white rounded-2xl p-5 shadow-sm border border-gray-100" with "bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
r = r.replace(/bg-white rounded-2xl p-5 shadow-sm border border-gray-100/g, 'bg-white rounded-2xl p-6 border border-gray-200 shadow-sm');

fs.writeFileSync('src/pages/DashboardPage.tsx', r);
