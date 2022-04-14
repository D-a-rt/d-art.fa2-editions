#!/usr/bin/env node

const program = require('commander');
import * as ver from './ver';
import * as contract from './contract';
import * as helper from './helper';

program
    .command('compile-contract')
    .action(contract.compileContract)

program
    .command('contract-size')
    .action(contract.calculateSize)

program
    .command('deploy-contract')
    .action(contract.deployContract)

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