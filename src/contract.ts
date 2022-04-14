require('dotenv').config()
import * as fs from 'fs';
import * as path from 'path';
import * as kleur from 'kleur';
import * as child from 'child_process';

import { loadFile } from './helper';
import { InMemorySigner } from '@taquito/signer';
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';

export async function compileSerieContract(): Promise<void> {

    await new Promise<void>((resolve, reject) =>
        // Compile the contract
        child.exec(
            path.join(__dirname, "../ligo/exec_ligo compile contract " + path.join(__dirname, "../ligo/d-art.fa2-editions/fa2_multi_nft_token_editions_serie.mligo") + " -e serie_editions_main -p hangzhou"),
            (err, stdout) => {
                if (err) {
                    console.log(kleur.red('Failed to compile the contract.'));
                    console.log(kleur.yellow().dim(err.toString()))
                    reject();
                } else {
                    console.log(kleur.green('Contract compiled succesfully at:'))
                    // Write json contract into json file
                    console.log('  ' + path.join(__dirname, '../ligo/d-art.fa2-editions/compile/fa2_multi_nft_token_editions_serie.tz'))
                    fs.writeFileSync(path.join(__dirname, '../ligo/d-art.fa2-editions/compile/fa2_multi_nft_token_editions_serie.tz'), stdout)
                    resolve();
                }
            }
        )
    );
}

export async function compileContract(): Promise<void> {

    await new Promise<void>((resolve, reject) =>
        // Compile the contract
        child.exec(
            path.join(__dirname, "../ligo/exec_ligo compile contract " + path.join(__dirname, "../ligo/d-art.fa2-editions/fa2_multi_nft_token_editions.mligo") + " -e editions_main -p hangzhou"),
            (err, stdout) => {
                if (err) {
                    console.log(kleur.red('Failed to compile the contract.'));
                    console.log(kleur.yellow().dim(err.toString()))
                    reject();
                } else {
                    console.log(kleur.green('Contract compiled succesfully at:'))
                    // Write json contract into json file
                    console.log('  ' + path.join(__dirname, '../ligo/d-art.fa2-editions/compile/fa2_multi_nft_token_editions.tz'))
                    fs.writeFileSync(path.join(__dirname, '../ligo/d-art.fa2-editions/compile/fa2_multi_nft_token_editions.tz'), stdout)
                    resolve();
                }
            }
        )
    );
}

export async function calculateSize(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
        // Compile the contract
        child.exec(
            path.join(__dirname, "../ligo/exec_ligo info measure-contract " + path.join(__dirname, "../ligo/d-art.fa2-editions/views.mligo") + "  -e editions_main -p hangzhou"),
            (err, stdout) => {
                if (err) {
                    console.log(kleur.red('Failed to calculate the contract size.'));
                    console.log(kleur.yellow().dim(err.toString()))
                    reject();
                } else {
                    console.log(kleur.green(`Contract size: ${stdout}`))
                    resolve();
                }
            }
        )
    );
}

export async function deployContract(): Promise<void> {
    const code = await loadFile(path.join(__dirname, '../ligo/d-art.fa2-editions/compile/fa2_multi_nft_token_editions.tz'))

    const originateParam = {
        code: code,
        storage: {
            next_edition_id: 0,
            editions_metadata: MichelsonMap.fromLiteral({}),
            max_editions_per_run: 250,
            assets: {
                ledger: MichelsonMap.fromLiteral({}),
                token_metadata: MichelsonMap.fromLiteral({}),
                operators: MichelsonMap.fromLiteral({})
            },
            admin: {
                admin: 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd',
                pending_admin: null,
                pause: false,
                minters: MichelsonMap.fromLiteral({})
            },
            metadata: MichelsonMap.fromLiteral({})
        }
    }

    try {
        const toolkit = await new TezosToolkit('http://art-basel.tzconnect.berlin:18732');

        toolkit.setProvider({ signer: await InMemorySigner.fromSecretKey(process.env.ADMIN_PRIVATE_KEY!) });


        const originationOp = await toolkit.contract.originate(originateParam);

        await originationOp.confirmation();
        const { address } = await originationOp.contract()

        console.log('Contract deployed at: ', address)

    } catch (error) {
        const jsonError = JSON.stringify(error);
        console.log(kleur.red(`FA2 editions ${jsonError}`));
    }
}


export async function deploySerieContract(): Promise<void> {
    const code = await loadFile(path.join(__dirname, '../ligo/d-art.fa2-editions/compile/fa2_multi_nft_token_editions_serie.tz'))

    const originateParam = {
        code: code,
        storage: {
            next_edition_id: 0,
            editions_metadata: MichelsonMap.fromLiteral({}),
            max_editions_per_run: 250,
            assets: {
                ledger: MichelsonMap.fromLiteral({}),
                token_metadata: MichelsonMap.fromLiteral({}),
                operators: MichelsonMap.fromLiteral({})
            },
            admin: 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd',
            metadata: MichelsonMap.fromLiteral({})
        }
    }

    try {
        const toolkit = await new TezosToolkit('http://art-basel.tzconnect.berlin:18732');

        toolkit.setProvider({ signer: await InMemorySigner.fromSecretKey(process.env.ADMIN_PRIVATE_KEY!) });


        const originationOp = await toolkit.contract.originate(originateParam);

        await originationOp.confirmation();
        const { address } = await originationOp.contract()

        console.log('Contract deployed at: ', address)

    } catch (error) {
        const jsonError = JSON.stringify(error);
        console.log(kleur.red(`FA2 editions ${jsonError}`));
    }
}
