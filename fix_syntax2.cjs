const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const lines = file.split('\n');

// I need to find the correct `) : (` that was originally at line 455 (before).
// And delete everything in between.
let start = -1;
let end = -1;

for (let i = 480; i < 530; i++) {
  if (lines[i].includes(') : (')) {
    if (start === -1) {
      start = i;
    } else {
      end = i;
      break;
    }
  }
}

if (start !== -1 && end !== -1) {
  lines.splice(start + 1, end - start - 1);
}

fs.writeFileSync('src/components/CreatePostScreen.tsx', lines.join('\n'));
