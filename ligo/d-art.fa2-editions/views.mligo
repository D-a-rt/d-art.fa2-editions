type royalties =
[@layout:comb]
{
  address: address;
  percentage: nat;
}

[@view]
let minter_royalties (token_id, storage : token_id * editions_storage) : royalties =
  match (Big_map.find_opt token_id storage.assets.ledger) with
    | Some addr ->
            let edition_id = token_id_to_edition_id(token_id, storage) in
            (match (Big_map.find_opt edition_id storage.editions_metadata) with
            | Some edition_metadata -> ({
              address = edition_metadata.creator;
              percentage = edition_metadata.royalties_percentage;
            }: royalties)

            | None -> (failwith "FA2_TOKEN_UNDEFINED" : royalties))
    | None -> (failwith "FA2_TOKEN_UNDEFINED" : royalties)
