const fs = require('fs');
const glob = require('glob');

function replaceTimezones() {
    const files = glob.sync('src/**/*.{ts,tsx}');
    let totalReplaced = 0;

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        // .toLocaleDateString() -> .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
        // .toLocaleDateString('en-US', { ... }) -> .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ... })
        
        // This is tricky to do perfectly with regex because of the options object.
        // I will do simpler string replacements for the specific ones I know.

        content = content.replace(
            /toLocaleDateString\('en-US', { weekday: 'short' }\)/g, 
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' })"
        );

        content = content.replace(
            /toLocaleTimeString\(\[\], { hour: '2-digit', minute: '2-digit' }\)/g,
            "toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })"
        );

        content = content.replace(
            /toLocaleDateString\(\)/g,
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })"
        );

        content = content.replace(
            /toLocaleDateString\('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }\)/g,
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })"
        );

        content = content.replace(
            /toLocaleDateString\('en-US', { weekday: 'long', month: 'long', day: 'numeric' }\)/g,
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric' })"
        );
        
        content = content.replace(
            /toLocaleDateString\('en-US', { month: 'short', day: 'numeric', year: 'numeric' }\)/g,
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' })"
        );

        content = content.replace(
            /toLocaleDateString\(undefined, { month: 'short', day: 'numeric' }\)/g,
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })"
        );

        content = content.replace(
            /toLocaleTimeString\(\[\], { hour: '2-digit', minute: '2-digit', second: '2-digit' }\)/g,
            "toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })"
        );

        content = content.replace(
            /toLocaleString\(\)/g,
            "toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })"
        );

        content = content.replace(
            /toLocaleTimeString\(\[\], { hour: "2-digit", minute: "2-digit" }\)/g,
            "toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })"
        );

        content = content.replace(
            /toLocaleDateString\(\[\], { day: "numeric", month: "short" }\)/g,
            "toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })"
        );

        if (original !== content) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Replaced in ${file}`);
            totalReplaced++;
        }
    });
    
    console.log(`Done. Updated ${totalReplaced} files.`);
}

replaceTimezones();
