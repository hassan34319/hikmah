#!/bin/bash
cd /home/claude/hikmah-platform/tools/tutorials
for spec in "hk.teacher|Imran Siddiqui|male" "hk.lms.ayesha|Ayesha Noor|female" "hk.lms.hamza|Hamza Qureshi|male" "hk.lms.sana|Sana Javed|female" "hk.lms.fahad|Fahad Mirza|male"; do
  IFS='|' read tag name g <<< "$spec"
  [ -f ".auth-$tag.json" ] && { echo "have $tag"; continue; }
  ASK_DIR=$PWD/ask node lms-auth.mjs "$tag" "$name" "$g" 2>&1 | tail -2
done
echo CAST DONE
