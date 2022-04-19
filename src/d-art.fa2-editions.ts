#!/usr/bin/env node

const program = require('commander');
import * as ver from './ver';
import * as contract from './contract';
import * as helper from './helper';

program
    .command('compile-contract')
    .action(contract.compileContract)

// program
//     .command('get-contract-view')
//     .option('-c, --contract <contract>', 'Contract address')
//     .action((contract: string) => {
//         contract.getViews(contract)
// })

program
    .command('compile-serie-contract')
    .action(contract.compileSerieContract)

program
    .command('contract-size')
    .action(contract.calculateSize)

program
    .command('deploy-contract')
    .action(contract.deployContract)

program
    .command('deploy-serie-contract')
    .action(contract.deploySerieContract)

    program
    .command('gen-keypair')
    .option('-s, --seed <seed>', 'Seed phrase to generate keys')
    .action((seed: string) => {
        helper.generateKeyPair(seed)
    })

program
    .command('sign-payload')
    .option('-m, --message <payload>', 'Payload to encode')
    .action((option: any) => {
        helper.encodePayload(option.message)
    })

program
    .option('-v', 'show version', ver, '')
    .action(ver.showVersion);

program.parse(process.argv)