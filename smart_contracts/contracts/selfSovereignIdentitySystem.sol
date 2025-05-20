// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract SelfSovereignIdentitySystem {
    struct Identity {
        string name;
        string email;
        string metadata; // Can store IPFS hash or encrypted JSON
        bool isVerified;
    }

    mapping(address => Identity) private identities;

    event IdentityCreated(address indexed user, string name, string email);
    event IdentityUpdated(address indexed user, string name, string email);
    event IdentityVerified(address indexed user);

    modifier onlyOwner(address _user) {
        require(msg.sender == _user, "Unauthorized: Not identity owner");
        _;
    }

    function createIdentity(string memory _name, string memory _email, string memory _metadata) public {
        Identity storage id = identities[msg.sender];
        require(bytes(id.name).length == 0, "Identity already exists");

        identities[msg.sender] = Identity(_name, _email, _metadata, false);
        emit IdentityCreated(msg.sender, _name, _email);
    }

    function updateIdentity(string memory _name, string memory _email, string memory _metadata) public {
        Identity storage id = identities[msg.sender];
        require(bytes(id.name).length != 0, "Identity does not exist");

        id.name = _name;
        id.email = _email;
        id.metadata = _metadata;
        emit IdentityUpdated(msg.sender, _name, _email);
    }

    function verifyIdentity(address _user) public {
        // In production, add authentication mechanism for trusted verifier
        identities[_user].isVerified = true;
        emit IdentityVerified(_user);
    }

    function getIdentity(address _user) public view returns (string memory, string memory, string memory, bool) {
        Identity memory id = identities[_user];
        return (id.name, id.email, id.metadata, id.isVerified);
    }
}