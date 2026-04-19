const fs = require('fs');
let code = fs.readFileSync('src/pages/OfficeXarajat.js', 'utf8');

// The prefix is everything from the top of the file up to `return (`
let prefixStart = 0;
// We look for the main return statement of the component.
let prefixEnd = code.lastIndexOf('  return (');
let logic = code.substring(prefixStart, prefixEnd);

let rightStart = code.lastIndexOf('<div className="OfficeXarajatRight"');
let jsxEnd = code.lastIndexOf(');');
let jsxBody = code.substring(rightStart, jsxEnd);

// Modify logic block
logic = logic.replace(/function OfficeXarajat\(\) {/, 'function ProjectReport({ projectId, projectName, isRightPanelOpen, setIsRightPanelOpen }) {');
logic = logic.replace(/const \[isRightPanelOpen, setIsRightPanelOpen\] = useState\(false\);\n/g, '');
logic = logic.replace(/const \[isSidebarOpen, setIsSidebarOpen\] = useState\(false\);\n/g, '');
logic = logic.replace(/const navigate = useNavigate\(\);\n/g, '');

// Clean up unused/parent-managed states like logoutDialog
logic = logic.replace(/const \[logoutDialog, setLogoutDialog\] = useState\(false\);\n/g, '');
const logoutFuncs = `  const confirmLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("password");
    navigate("/login");
  };

  const handleLogoutCancel = () => {
    setLogoutDialog(false);
  };

`;
logic = logic.replace(logoutFuncs, '');

// Replace persistance keys
logic = logic.replace(/office_expenses_\\$\\{storedUsername\\}/g, 'project_${projectId}_expenses_${storedUsername}');
logic = logic.replace(/office_balance_\\$\\{storedUsername\\}/g, 'project_${projectId}_balance_${storedUsername}');
logic = logic.replace(/office_initial_balance_\\$\\{storedUsername\\}/g, 'project_${projectId}_initial_balance_${storedUsername}');

logic = logic.replace(/office_expenses_\\$\\{username\\}/g, 'project_${projectId}_expenses_${username}');
logic = logic.replace(/office_balance_\\$\\{username\\}/g, 'project_${projectId}_balance_${username}');
logic = logic.replace(/office_initial_balance_\\$\\{username\\}/g, 'project_${projectId}_initial_balance_${username}');

logic = logic.replace(/\[navigate\]\)/g, '[projectId])');
logic = logic.replace(/\[expenses, username\]\)/g, '[expenses, username, projectId])');
logic = logic.replace(/\[totalBalance, username\]\)/g, '[totalBalance, username, projectId])');
logic = logic.replace(/\[initialBalance, username\]\)/g, '[initialBalance, username, projectId])');

// Modify the JSX string
jsxBody = jsxBody.replace(/<div className="OfficeXarajatRight"[^>]*>/, '<div className="OfficeXarajatRight" style={{ marginLeft: 0, width: "100%" }}>');
jsxBody = jsxBody.replace(/<h2[^>]*>\{t\("o'fisxarajatlari"\)\}<\/h2>/, '<h2 style={{marginRight: "20px", fontSize: "20px", color: "#fff"}}>{projectName}</h2>');
jsxBody = jsxBody.replace(/"Hozircha xarajatlar yo'q\. \\"\+ Qo'shish\\" tugmasini bosing\."/g, 't("Hozircha xarajatlar yo\'q. \\"+ Qo\'shish\\" tugmasini bosing.")');
jsxBody = jsxBody.replace(/"Qidiruv bo'yicha hech narsa topilmadi\."/g, 't("Qidiruv bo\'yicha hech narsa topilmadi.")');
jsxBody = jsxBody.replace(/Masalan: Ijara, Elektr\.\.\./g, 'Masalan: Ijara, Elektr...');

// Strip out the logout dialog from jsxBody
jsxBody = jsxBody.replace(/\{logoutDialog && \([\s\S]*?className="confirm-overlay"[\s\S]*?<div className="confirm-buttons"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}/g, '');

let finalCode = logic + '  return (\n    <>\n' + jsxBody + '\n    </>\n  );\n}\n\nexport default ProjectReport;\n';
finalCode = finalCode.replace(/\$\{projectId\}/g, '${projectId}'); // Keep it in template literals

fs.writeFileSync('src/pages/ProjectReport.js', finalCode);
console.log('Done!');
