const fs = require('fs');
let code = fs.readFileSync('src/pages/OfficeXarajat.js', 'utf8');

// Replace component definition
code = code.replace(/function OfficeXarajat\(\) {/, 'function ProjectReport({ projectId, projectName, isRightPanelOpen, setIsRightPanelOpen }) {');

// Remove local isRightPanelOpen state
code = code.replace(/const \[isRightPanelOpen, setIsRightPanelOpen\] = useState\(false\);\n/, '');

// Remove OfficeXarajatLeft completely
const leftStart = code.indexOf('<div className="OfficeXarajatLeft');
if (leftStart > -1) {
  const leftEnd = code.indexOf('<div className="OfficeXarajatRight"');
  code = code.substring(0, leftStart) + code.substring(leftEnd);
}

// Remove main container div and close tags
code = code.replace(/<div className="OfficeXarajat">\n/, '');
// Remove mobile buttons
code = code.replace(/<button[^>]*mobile-menu-btn[^>]*>[\s\S]*?<\/button>/m, '');
code = code.replace(/<button[^>]*right-panel-toggle-btn[^>]*>[\s\S]*?<\/button>/m, '');

// Clean up extra wrapper at the end
const lastClose = code.lastIndexOf('</div>');
if(lastClose > -1) {
  code = code.substring(0, lastClose) + code.substring(lastClose + 6);
}

// Ensure 100% width on right panel
code = code.replace(/<div className="OfficeXarajatRight">/, '<div className="OfficeXarajatRight" style={{ marginLeft: 0, width: "100%" }}>');

// Replace 'O\'fis Xarajatlari' title with projectName
code = code.replace(/<h2 style={{marginRight: '20px', fontSize: '20px', color: '#fff'}}>{t\("o'fisxarajatlari"\)}<\/h2>/, '<h2 style={{marginRight: "20px", fontSize: "20px", color: "#fff"}}>{projectName}</h2>');

// Add translation wrapping to the strings that lacked it in OfficeXarajat
code = code.replace(/"Hozircha xarajatlar yo'q\. \\"\+ Qo'shish\\" tugmasini bosing\."/g, 't("Hozircha xarajatlar yo\'q. \\"+ Qo\'shish\\" tugmasini bosing.")');
code = code.replace(/"Qidiruv bo'yicha hech narsa topilmadi\."/g, 't("Qidiruv bo\'yicha hech narsa topilmadi.")');
code = code.replace(/Masalan: Ijara, Elektr\.\.\./g, 'Masalan: Ijara, Elektr...');

// Persistence keys
code = code.replace(/office_expenses_\\$\\{storedUsername\\}/g, 'project_${projectId}_expenses_${storedUsername}');
code = code.replace(/office_balance_\\$\\{storedUsername\\}/g, 'project_${projectId}_balance_${storedUsername}');
code = code.replace(/office_initial_balance_\\$\\{storedUsername\\}/g, 'project_${projectId}_initial_balance_${storedUsername}');

code = code.replace(/office_expenses_\$\{username\}/g, 'project_${projectId}_expenses_${username}');
code = code.replace(/office_balance_\$\{username\}/g, 'project_${projectId}_balance_${username}');
code = code.replace(/office_initial_balance_\$\{username\}/g, 'project_${projectId}_initial_balance_${username}');

// Fix dependencies array
code = code.replace(/\[navigate\]\)/g, '[projectId])');
code = code.replace(/\[expenses, username\]\)/g, '[expenses, username, projectId])');
code = code.replace(/\[totalBalance, username\]\)/g, '[totalBalance, username, projectId])');
code = code.replace(/\[initialBalance, username\]\)/g, '[initialBalance, username, projectId])');

code = code.replace(/export default OfficeXarajat;/, 'export default ProjectReport;');

fs.writeFileSync('src/pages/ProjectReport.js', code);
console.log('ProjectReport.js rewritten successfully from OfficeXarajat.js!');
