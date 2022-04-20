require('dotenv').config()
import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
import * as kleur from 'kleur';
import * as child from 'child_process';

import { loadFile } from './helper';
import { InMemorySigner } from '@taquito/signer';
import { char2Bytes } from '@taquito/tzip16';
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import { default as EditionsMetadata } from './views/fa2_editions_token_metadata_view.tz';
import { Parser} from '@taquito/michel-codec';
import { default as EditionsMinterRoyaltiesViewCodeType } from './views/fa2_editions_minter_royalties.tz';


export async function compileContract(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
        // Compile the contract
        child.exec(
            path.join(__dirname, "../ligo/exec_ligo compile contract " + path.join(__dirname, "../ligo/d-art.fa2-editions/views.mligo") + " -e editions_main -p hangzhou --views 'token_metadata, minter_royalties'"),
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
            path.join(__dirname, "../ligo/exec_ligo info measure-contract " + path.join(__dirname, "../ligo/d-art.fa2-editions/views.mligo") + " -e editions_main -p hangzhou --views 'token_metadata, minter_royalties' "),
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

    const p = new Parser();

    const parsedEditionMetadataMichelsonCode = p.parseMichelineExpression(EditionsMetadata.code);
    const parsedMinterRoyaltiesMichelsonCode = p.parseMichelineExpression(EditionsMinterRoyaltiesViewCodeType.code)

    const editions_contract_metadata = {
        name: 'A:RT',
        description: 'Implementation of the edition version of the FA2 standart on Tezos.',
        interfaces: ['TZIP-012', 'TZIP-016'],
        views: [{
            name: 'token_metadata',
            description: 'Get the metadata for the tokens minted using this contract',
            pure: false,
            implementations: [
                {
                    michelsonStorageView:
                    {
                        parameter: {
                            prim: 'nat',
                        },
                        returnType: {
                            prim: "pair",
                            args: [
                                { prim: "nat", annots: ["%token_id"] },
                                { prim: "map", args: [{ prim: "string" }, { prim: "bytes" }], annots: ["%token_info"] },
                            ],
                        },
                        code: parsedEditionMetadataMichelsonCode,
                    },
                },
            ],
        }, {
            name: 'minter_royalties',
            description: 'Get the address and the percentage to be sent to the minter of the NFTs (royalties) providing the token_id to the view',
            pure: false,
            implementations: [
                {
                    michelsonStorageView:
                    {
                        parameter: {
                            prim: 'nat'
                        },
                        returnType: {
                            prim: "pair",
                            args: [
                                { prim: "address", annots: ["%address"] },
                                { prim: "nat", annots: ["%percentage"] }
                            ],
                        },
                        code: parsedMinterRoyaltiesMichelsonCode
                    },
                },
            ],
        }],
    };

    const contractMetadata = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', editions_contract_metadata, {
        headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_PINATA_JWT}`
        }
    })

    if (!contractMetadata.data.IpfsHash) {
        console.log(kleur.red(`An error happened while uploading the ipfs metadata of the contract.`));
        return;
    }

    // Encode direct into bytes and push in the contract (We can user this in order to harcode the value directly
    // inside the contract (it will become expensive ~ 5tez per origination))
    // Using the ipfs hash will reduce the origination to 1.5tez
    // const editions_meta_encoded = char2Bytes(JSON.stringify(editions_contract_metadata, null, 2));

    const originateParam = {
        code: code,
        storage: {
            next_edition_id: 0,
            editions_metadata: MichelsonMap.fromLiteral({}),
            max_editions_per_run: 250,
            assets: {
                ledger: MichelsonMap.fromLiteral({}),
                operators: MichelsonMap.fromLiteral({}),
                token_metadata: MichelsonMap.fromLiteral({})
            },
            admin: {
                admin: 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd',
                pending_admin: null,
                pause: false,
                minters: MichelsonMap.fromLiteral({})
            },
            metadata: MichelsonMap.fromLiteral({
                // "": char2Bytes('tezos-storage:content'),
                // "content": editions_meta_encoded
                "": char2Bytes(`ipfs://${contractMetadata.data.IpfsHash}`),
            })
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

// export async function getViews(contractAddress: string): Promise<void> {
//     const toolkit = new TezosToolkit('http://art-basel.tzconnect.berlin:18732');
//     toolkit.addExtension(new Tzip16Module() as any);

//     const contract = await toolkit.contract.at(contractAddress, tzip16 as any);

//     const metadata = await contract.tzip16().getMetadata();
//     const views = await contract.tzip16().metadataViews();
// }


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
