const fs = require('fs');
const path = require('path');

let files = fs.readdirSync(__dirname);
let baseContent = fs
        .readFileSync('./README.md')
        .toString()
        .replace(/##\s*全站导航[\s\S]+/, ''),
    articleContent = '',
    dirName = path.parse(__dirname).name,
    dirNameReg = new RegExp('^\\[\\d+\\]' + dirName + '\\.md$', 'i');

let menu = [];

files.forEach(file => {
    if (dirNameReg.test(file)) {
        dirName = file;
    }
    let stepPath = path.resolve(__dirname, file);
    let stat = fs.statSync(stepPath);
    if (stat.isDirectory()) {
        let dirName = path.parse(stepPath).name;
        let mdFile = path.resolve(stepPath, 'README.md');
        let mdStat = (fs.existsSync(mdFile) && fs.statSync(mdFile)) || {
            isFile: () => {}
        };

        if (mdStat.isFile()) {
            let content = fs.readFileSync(mdFile).toString();
            let title = content.split('\n')[0];
            title = title ? title.replace(/# *|\s$/g, '') : '';
            menu.push([dirName, title]);
            title = title.replace(/\n/, '');
            content = content.replace(/(?:^|\n)(#)/g, '$1$1');
            articleContent += '\n' + content;
        }
    }
});

let navContent = `
## 全站导航

${menu
    .map(([dirName, title]) => {
        return `[${title}](./${dirName}/README.md)`;
    })
    .join('\n')}
`;
navContent = baseContent + navContent + articleContent;
fs.writeFileSync('./README.md', navContent);

articleContent = baseContent + articleContent;
// articleContent = articleContent.replace(/<(\/?script>)/g, '《$1');
fs.writeFileSync('./' + dirName, articleContent);
