const fs = require('fs');
const path = require('path');

let files = fs.readdirSync(__dirname);
let baseContent = fs.readFileSync('./README.md').toString(),
    vexpressContent = baseContent;
let menu = [];
files.forEach(file => {
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
            vexpressContent += '\n' + content;
        }
    }
});

if (baseContent.indexOf('全站导航') === -1) {
    let navContent = `
## 全站导航

${menu
    .map(([dirName, title]) => {
        return `[${title}](./${dirName}/README.md)`;
    })
    .join('\n')}
`;
    navContent = baseContent + navContent;
    console.log(navContent);
    fs.writeFileSync('./README.md', navContent);
}

fs.writeFileSync('./VVuex.md', vexpressContent);
