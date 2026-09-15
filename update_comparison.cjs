const fs = require('fs');
let r = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');

if (!r.includes('import React')) {
    r = r.replace(/import \{.*?\} from 'react';/, \"import React, { useState } from 'react';\");
}

r = r.replace(
  /const chartData = sorted\.slice\(0, 15\)\.map\(d => \(\{/g,
  'const chartData = React.useMemo(() => sorted.slice(0, 15).map(d => ({'
);

r = r.replace(
  /    status: d\.statusINACBG\n  \}\)\);/g,
  '    status: d.statusINACBG\\n  })), [sorted]);'
);

fs.writeFileSync('src/pages/ComparisonPage.tsx', r);
