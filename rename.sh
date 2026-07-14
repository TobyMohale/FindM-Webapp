#!/bin/bash
find src -type f -name "*.tsx" -exec sed -i 's/FindMe/LoTap/g' {} +
find src -type f -name "*.tsx" -exec sed -i 's/findme\.co\.za/lotap.co.za/g' {} +
