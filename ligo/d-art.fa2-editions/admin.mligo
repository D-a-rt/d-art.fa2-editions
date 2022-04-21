type admin_storage = {
  admin : address;
  pending_admin : address option;
  paused : bool;
  minters : (address, unit) big_map;
}

type admin_entrypoints =
  | Set_admin of address
  | Confirm_admin of unit
  | Pause of bool
  | Add_minter of address
  | Remove_minter of address

let confirm_new_admin (storage : admin_storage) : admin_storage =
  match storage.pending_admin with
  | None -> (failwith "NO_PENDING_ADMIN" : admin_storage)
  | Some pending ->
    if Tezos.sender = pending
    then { storage with
      pending_admin = (None : address option);
      admin = Tezos.sender;
    }
    else (failwith "NOT_A_PENDING_ADMIN" : admin_storage)

(* Fails if sender is not admin *)
let fail_if_not_admin_ext (storage, extra_msg : admin_storage * string) : unit =
  if Tezos.sender <> storage.admin
  then failwith ("NOT_AN_ADMIN" ^  " "  ^ extra_msg)
  else unit

(* Fails if sender is not admin *)
let fail_if_not_admin (storage : admin_storage) : unit =
  if Tezos.sender <> storage.admin
  then failwith "NOT_AN_ADMIN"
  else unit

(* Returns true if sender is admin *)
let is_admin (storage : admin_storage) : bool = Tezos.sender = storage.admin

let fail_if_paused (storage : admin_storage) : unit =
  if(storage.paused)
  then failwith "PAUSED"
  else unit

(*Only callable by admin*)
let set_admin (new_admin, storage : address * admin_storage) : admin_storage =
  let () = fail_if_not_admin storage in
  { storage with pending_admin = Some new_admin; }

(*Only callable by admin*)
let pause (paused, storage: bool * admin_storage) : admin_storage =
  let () = fail_if_not_admin storage in
  { storage with paused = paused; }

let is_minter (minter, storage : address * admin_storage) : bool =
  let () = fail_if_not_admin storage in
  Big_map.mem minter storage.minters

(* Fails if sender is not admin *)
let fail_if_not_minter (storage : admin_storage) : unit =
  if Big_map.mem Tezos.sender storage.minters
  then unit
  else failwith "NOT_A_MINTER"

let admin_main(param, storage : admin_entrypoints * admin_storage)
    : (operation list) * admin_storage =
  match param with
  | Set_admin new_admin ->
      let new_s = set_admin (new_admin, storage) in
      (([] : operation list), new_s)

  | Confirm_admin _u ->
      let new_s = confirm_new_admin storage in
      (([]: operation list), new_s)

  | Pause paused ->
      let new_s = pause (paused, storage) in
      (([]: operation list), new_s)

  | Add_minter new_minter ->
    if is_minter (new_minter, storage)
    then (failwith "ALREADY_MINTER" : operation list * admin_storage)
    else ([]: operation list), { storage with minters = Big_map.add new_minter unit storage.minters}

  | Remove_minter old_minter_addess ->
    if is_minter (old_minter_addess, storage)
    then ([]: operation list), { storage with minters = Big_map.remove old_minter_addess storage.minters }
    else (failwith "MINTER_NOT_FOUND" : operation list * admin_storage)
