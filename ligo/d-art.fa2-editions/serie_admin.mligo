(* Fails if sender is not admin *)
let fail_if_not_admin_ext (storage, extra_msg : editions_storage * string) : unit =
  if Tezos.sender <> storage.admin
  then failwith ("NOT_AN_ADMIN" ^  " "  ^ extra_msg)
  else unit

(* Fails if sender is not admin *)
let fail_if_not_admin (storage : editions_storage) : unit =
  if Tezos.sender <> storage.admin
  then failwith "NOT_AN_ADMIN"
  else unit

(* Returns true if sender is admin *)
let is_admin (storage : editions_storage) : bool = Tezos.sender = storage.admin
