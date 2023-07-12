// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice A simple ERC20 Token implementation that
 */
contract CarbonToken is ERC20, Ownable, UsingRegistryV2, Pausable {
    using SafeMath for uint256;

    uint256 public _totalAmountBurned;
    address[] public _trustedIssuers;
    mapping(bytes32 => bool) public _hasMinted;
    mapping(address => uint256) public _addressToAmountBurned;

    constructor(
        address[] memory trustedIssuers
    ) ERC20("CarbonToken", "C02") Ownable(msg.sender) {
        _mint(msg.sender, 10000000e18);
        _trustedIssuers = trustedIssuers;
        _amountBurned = 0;
    }

    function setTrustedIssuers(
        address[] memory trustedIssuers
    ) external onlyOwner {
        _trustedIssuers = trustedIssuers;
    }

    function burn(uint256 value) external virtual whenNotPaused {
        require(hasRegistered(identifier, msg.sender));
        _totalAmountBurned = _totalAmountBurned.add(value);
        _addressToAmountBurned[msg.sender] = _addressToAmountBurned[msg.sender]
            .add(value);
        _burn(msg.sender, value);
    }

    function mint(bytes32 identifier) external virtual whenNotPaused {
        require(!hasMinted(identifier));
        require(hasRegistered(identifier, msg.sender));
        _mint(msg.sender, value);
    }

    function hasMinted(bytes32 identifier) public view {
        return _hasMinted[identifier];
    }

    /**
     * @notice Checks if there are attestations for account <-> identifier from
     *         any of trustedIssuers in FederatedAttestations.sol.
     * @param identifier The hash of an identifier for which to look up attestations.
     * @param account The account for which to look up attestations.
     * @param trustedIssuers Issuer addresses whose attestations to trust.
     * @return Whether or not attestations exist in FederatedAttestations.sol
     *         for (identifier, account).
     */
    function hasRegistered(
        bytes32 identifier,
        address account
    ) public view returns (bool) {
        // Check for an attestation from a trusted issuer
        IFederatedAttestations federatedAttestations = getFederatedAttestations();
        (, address[] memory accounts, , , ) = federatedAttestations
            .lookupAttestations(identifier, _trustedIssuers);
        // Check if an attestation was found for recipientIdentifier -> account
        for (uint256 i = 0; i < accounts.length; i = i.add(1)) {
            if (accounts[i] == account) {
                return true;
            }
        }
        return false;
    }
}
