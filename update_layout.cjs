const fs = require('fs');

let layout = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

// Remove glassmorphism from sidebar
layout = layout.replace(/bg-white\\/80 backdrop-blur-xl border-r border-gray-200\\/60/g, 'bg-white border-r border-gray-200');

// Remove glassmorphism from header
layout = layout.replace(/bg-white\\/70 backdrop-blur-md border-b border-gray-200\\/50/g, 'bg-white border-b border-gray-200');

fs.writeFileSync('src/components/layout/AppLayout.tsx', layout);
