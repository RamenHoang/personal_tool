const events = require('events');
const fs = require('fs');
const readline = require('readline');
const path = require("path");
const { EOL } = require('os');
const { execSync } = require('child_process');
const { access, writeFile, appendFile } = require('fs/promises');

const keepingBranches = [
    'develop',
    'master',
    'testing',
];

/**
 * 
 * @param {string} remoteBranchName
 */
function getBranchName(remoteBranchName) {
    const pattern = /^remotes\/origin\/(.*)/;

    const matches = remoteBranchName.match(pattern);

    return matches === null ? remoteBranchName : matches[1];
}

/**
 * 
 * @param {string} question 
 * @returns 
 */
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(question, ans => {
        rl.close();
        resolve(ans);
    }));
}


async function processLineByLine(filePath, callback) {
    try {
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity
        });

        rl.on('line', callback);

        await events.once(rl, 'close');

        console.log(`Reading file "${filePath}" line by line with readline done.`);
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
    } catch (err) {
        console.error(err);
    }
};

(async function main() {
    try {
        const projectPath = await ask('Project path: ');

        await processLineByLine(
            path.join(__dirname, 'keeping_branches.txt'),
            function (line) {
                if (line) {
                    keepingBranches.push(line);
                }
            }
        );


        await access(path.join(__dirname, 'git_remove_branch_command.txt'), fs.constants.F_OK);

        await writeFile(path.join(__dirname, 'git_remove_branch_command.txt'), '');

        await processLineByLine(
            path.join(__dirname, 'efcmc_cscart_full_remote_branches.log'),
            async function (line) {
                const branchName = getBranchName(line);
                if (keepingBranches.indexOf(branchName) !== -1) {
                    console.log(`[Skip branch]: ${branchName}`);
                    return;
                }
                const command = `cd ${projectPath} && git push -d origin ${branchName}`;
                await appendFile(path.join(__dirname, 'git_remove_branch_command.txt'), `${command}${EOL}`);
                console.log(`[Build command] ${command}${EOL}`);

                try {
                    console.log(`[Execution command] ${command}`);
                    execSync(command);
                } catch (error) {
                    console.error(`[Execution error]: ${error}`);
                }
            }
        );
    } catch (accessFileError) {
        console.log(accessFileError);
    }
})();
