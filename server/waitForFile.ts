import * as fs from 'fs';
const checkForChangesDiffMs = 2500;
const maxChangesDiffMs = 10000;

export default function waitForFile(filePath: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
  
      function checkLoop() {
        clearTimeout(timeoutId);
        const stat = fs.statSync(filePath);
        const lastChange = stat.mtimeMs;
        const now = Date.now()
        const diff = now - lastChange;
  
        if (diff > maxChangesDiffMs) {
          resolve(stat);
        } else {
          timeoutId = setTimeout(checkLoop, checkForChangesDiffMs);
        }
      }
      checkLoop();
    })
  };
  