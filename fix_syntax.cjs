const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const regex = /  \};\n\n        img\.onerror = \(\) => \{[\s\S]*?    \}\);\n  \};\n\n  const handleToggleTag = \(tag: string\) => \{/m;
const replacement = `  };

  const handleToggleTag = (tag: string) => {`;

if (regex.test(file)) {
    file = file.replace(regex, replacement);
    fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
    console.log("Replaced");
} else {
    console.log("Not matched");
}
