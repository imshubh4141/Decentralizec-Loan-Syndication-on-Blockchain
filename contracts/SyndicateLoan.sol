pragma solidity >= 0.4.22 < 0.9.0;

contract SyndicateLoan {

    struct Borrower {
        uint256 loanAmount;
        address addr;
    }
    
    struct Bank {
        string name;
        bool isAdmin;
        bool isParticipating;
        uint256 riskLimit;
        address addr;
        uint weight;
        bool voted;
        uint256 vote;
    }
    
    struct Proposal {
        string name;
        uint256 interest;
        uint256 tenure;
        uint256 voteCount;
        address addr;
    }

    Borrower public borrower;
    
    Bank public adminBank;
    Bank public temp1;
    Bank[] public banks;
    mapping(address => Bank) public bankDetails;
    
    enum Stage {Init,Reg, Vote, Done}
    Stage public stage = Stage.Init;
    
    Proposal[] public proposals;

    uint256 winningVoteCount = 0;
    uint256 _winningProposal;

    event votingCompleted();
    
    //uint public startTime;
    //modifiers
   modifier validStage(Stage reqStage)
    { require(stage == reqStage);
      _;
    }

    uint counter = 0;
    uint totalriskLimit = 0;

    constructor () {
        borrower = Borrower({loanAmount: 0, addr: msg.sender});
    }

    modifier onlyOwner {
        require(msg.sender == borrower.addr);
        _;
    }
    
    modifier onlyAdmin {
        require(msg.sender == adminBank.addr);
        _;
    }

    function setInitials(uint _loanAmount, address _adminBankAddress) public onlyOwner{
        if(_adminBankAddress == borrower.addr)
            revert();
        adminBank = Bank({
            name: "",
            isAdmin: true,
            isParticipating: true, 
            riskLimit: 0, 
            addr: _adminBankAddress,
            weight: 2,
            voted: false,
            vote: 0
        });
        borrower.loanAmount = _loanAmount;
    }
    
    function setAdminRiskLimit(string memory _name, uint256 _riskLimit, uint256 _tenure, uint256 _interest) public onlyAdmin {
        adminBank.riskLimit = _riskLimit;
        adminBank.name = _name;
        banks.push(adminBank);
        proposals.push(Proposal({
            name: _name,
            interest: _interest,
            tenure: _tenure,
            voteCount: 0,
            addr: msg.sender
        })); 
        counter++;
        bankDetails[adminBank.addr] = adminBank;
        totalriskLimit += _riskLimit;
        stage = Stage.Reg;
        //startTime = block.timestamp;
    }
    
    function registerBank(string memory _name, uint256 _riskLimit, uint256 _tenure, uint256 _interest) public {
        if (bankDetails[msg.sender].voted) 
            revert();
        banks.push(Bank({
            name: _name,
            isAdmin: false, 
            isParticipating: false, 
            riskLimit: _riskLimit, 
            addr: msg.sender,
            weight: 1,
            voted: false,
            vote: 0
        }));
        bankDetails[msg.sender] = banks[counter];
        proposals.push(Proposal({
            name: _name,
            interest: _interest,
            tenure: _tenure,
            voteCount: 0,
            addr: msg.sender
        })); 
        counter++;
        totalriskLimit += _riskLimit;
    }
    
    function instantiateLoan() public onlyOwner payable{
        if(totalriskLimit < borrower.loanAmount || borrower.loanAmount <= adminBank.riskLimit){
            revert();
        }
        //syndicate loan with other banks
        sortBanksWithRiskLimit();
        uint curr = adminBank.riskLimit;
            
        for(uint i = 1;i < counter;i++){
            //also need to store participating banks
            banks[i].isParticipating = true;
            curr += banks[i].riskLimit;
                
            if(curr >= borrower.loanAmount)
                break;
        }
        //startTime = block.timestamp;
        stage = Stage.Vote;  
    }
    
    function sortBanksWithRiskLimit() private{
        for(uint i = 1;i < counter-1;i++){
            for(uint j = 1;j < counter-i-1;j++){
                if(banks[j].riskLimit > banks[i].riskLimit){
                    temp1 = banks[j];
                    banks[j] = banks[i];
                    banks[i] = temp1;
                }
            }
        }
    }
    
    function getBorrower() public view returns(Borrower memory) {
        return borrower;
    }

    function getStage() public view returns(Stage) {
        return stage;
    }

    function getAdminBank() public view returns(Bank memory) {
        return adminBank;
    }

    function getAllBankDetails() public view returns(Bank[] memory) {
        Bank[] memory temp = new Bank[](counter);
        for(uint i = 0;i < counter;i++){
            temp[i] = banks[i];
        }
        return temp;
    }

    function getProposal() public view returns(Proposal[] memory) {
        Proposal[] memory temp = new Proposal[](counter);
        for(uint i = 0;i < counter;i++){
            temp[i] = proposals[i];
        }
        return temp;
    }

    /// Give a single vote to proposal $(toProposal).
    function vote(uint256 toProposal) public validStage(Stage.Vote)  {
       // if (stage != Stage.Vote) {return;}
        Bank storage sender = bankDetails[msg.sender];
        if (sender.voted || toProposal >= proposals.length || proposals[toProposal].addr == msg.sender) 
            revert();
        sender.voted = true;
        sender.vote = toProposal;   
        proposals[toProposal].voteCount += sender.weight;
        if(msg.sender == adminBank.addr)
            adminBank.vote = toProposal;
        if(check()) {
            stage = Stage.Done;
            emit votingCompleted();    
        }
    }

    function check() private view returns (bool) {
        for(uint i = 0;i < counter;i++){
            if(!bankDetails[banks[i].addr].voted)
                return false;
        }
        return true;
    }

    function winningProposal() public validStage(Stage.Done) onlyAdmin {
       //if(stage != Stage.Done) {return;}
        for (uint8 prop = 0; prop < proposals.length; prop++)
            if (proposals[prop].voteCount > winningVoteCount) {
                winningVoteCount = proposals[prop].voteCount;
                _winningProposal = prop;
            }
            else if (proposals[prop].voteCount == winningVoteCount && proposals[prop].voteCount!=0) {
                _winningProposal = adminBank.vote;
                break;
            }
       assert (winningVoteCount > 0);
       //return _winningProposal;
    }

    function getWinningProposal() public view onlyAdmin returns(uint256)  {
        return _winningProposal;
    }

    // function validateAmount(uint256 amount) return (bool){
        
    // }
    
    
}