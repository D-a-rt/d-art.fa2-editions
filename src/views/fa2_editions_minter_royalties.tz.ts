export type EditionsMinterRoyaltiesViewCodeType = { __type: 'EditionsMinterRoyaltiesViewCodeType'; code: string; };
export default {
  __type: 'EditionsMinterRoyaltiesViewCodeType', code: `
  { UNPAIR ;
    SWAP ;
    DUP ;
    DUG 2 ;
    CAR ;
    CAR ;
    CDR ;
    CAR ;
    CAR ;
    SWAP ;
    DUP ;
    DUG 2 ;
    GET ;
    IF_NONE
      { DROP 2 ; PUSH string "FA2_TOKEN_UNDEFINED" ; FAILWITH }
      { DROP ;
        SWAP ;
        DUP ;
        DUG 2 ;
        CAR ;
        CDR ;
        CDR ;
        SWAP ;
        EDIV ;
        IF_NONE { PUSH string "DIV by 0" ; FAILWITH } {} ;
        CAR ;
        SWAP ;
        CAR ;
        CDR ;
        CAR ;
        SWAP ;
        GET ;
        IF_NONE
          { PUSH string "FA2_TOKEN_UNDEFINED" ; FAILWITH }
          { DUP ; GET 10 ; SWAP ; CAR ; PAIR } } } }
  `
} as EditionsMinterRoyaltiesViewCodeType;
