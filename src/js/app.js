import SyndicateLoan from './SyndicateLoan.json' assert { type: "json" };

let web3;
let syndicateLoan;
let accounts = [];
let borrower;
let loanAmount;
let currentAccount;
let allProposals;
let winningProp;
// var transactionDetailsCalled = 0;

const testChainURL = 'http://localhost:9545';

window.addEventListener('load', () => {
  window.ethereum.on('accountsChanged', (_currentAccount) => {
    // currentAccount = _currentAccount[0];
    location.reload();
  });
});

const initWeb3 = () => {
  return new Promise((resolve, reject) => {
    if(typeof window.ethereum !== 'undefined'){
      window.ethereum.enable()
      .then(() => {
        resolve(new Web3(window.ethereum));
      })
      .catch(e => {
        reject(e);
      });
      return;
    }
    if(typeof window.web3 !== 'undefined'){
      return resolve(new Web3(window.web3.currentProvider));
    }
    //to connect to local test chain
    resolve(new Web3('http://localhost:9545'));
  })
};

const initContract = () => {
  const deploymentKey = Object.keys(
    SyndicateLoan.networks
  )[0];
  return new web3.eth.Contract(
    SyndicateLoan.abi,
    SyndicateLoan.networks[deploymentKey].address
  );
};


const initApp = () => {
  console.log(syndicateLoan.methods);
  
  let chosenAdminBankAddress;
  let loanAmount;

  getBorrower();

  console.log(currentAccount);

  populateAddress();
  
  $('#register_admin_form').submit(e => {
    e.preventDefault();
    chosenAdminBankAddress = $('#enter_address').val();
    loanAmount = $('#loan_amount').val();
    
    console.log(chosenAdminBankAddress + " " + loanAmount);

    web3.eth.getBalance(accounts[0])
    .then(console.log);

    registerAdminBank(loanAmount, chosenAdminBankAddress);
  });

  // banks risk limit setting
  $('#risk_limit_form').submit(e => {
    e.preventDefault();

    let name = $('#name').val();
    let riskLimit = $('#risk_limit').val();
    let interest = $('#interest').val();
    let tenure = $('#tenure').val();

    registerBank(name, riskLimit, chosenAdminBankAddress, interest, tenure);
  });
  
  $('#instantiate_loan').submit(e => {

    e.preventDefault();
    instantiateLoan();

    // setTimeout(() => {
    //   getTransactionDetails();
    // }, 5000);
    
  });
};

const getTransactionDetails = (_prop) => {
  syndicateLoan.methods
  .getAllBankDetails()
  .call({from:borrower})
  .then(result => {
    console.log(result)

    $('#participating_banks_container').append(`
      <div>
        <label for="" class="form-label">Loan Amount: </label>
        <input type="text" class="form-control" value=${loanAmount} size="44" disabled readonly>

        <label for="" class="form-label">Interest Rate: </label>
        <input type="text" class="form-control" value=${_prop.interest} size="44" disabled readonly>

        <label for="" class="form-label">Loan Tenure: </label>
        <input type="text" class="form-control" value=${_prop.tenure} size="44" disabled readonly>
      </div>`);

    $.each(result, (index, value) => {
      console.log(index + ' ' + value.addr);

      if(value.isParticipating) {
        $('#participating_banks_container').append(`
          <div>
            <label for="" class="form-label">Bank Name: </label>
            <input type="text" class="form-control" value=${value.name} size="44" disabled readonly>
          </div>`);
          
        if(value.isAdmin){
          $('#participating_banks_container').append(`
          <div>
            <label for="" class="form-label">Admin bank address: </label>
            <input type="text" class="form-control" value=${value.addr} size="44" disabled readonly>
          </div>`);
          
          } else {
            $('#participating_banks_container').append(`
          <div>
            <label for="" class="form-label">Partner bank - ${index} address: </label>
            <input type="text" class="form-control" value=${value.addr} size="44" disabled readonly>
          </div>`);
        }
        
        $('#participating_banks_container').append(`
        <div>
          <label for="" class="form-label">Risk Limit: </label>
          <input type="text" class="form-control" value=${value.riskLimit} size="44" disabled readonly>
        </div>`);
      }
    });
  });
  transactionDetailsCalled = 1;
}

const instantiateLoan = () => {

  // $('#register_admin_form').hide();
  // $('#instantiate_loan').hide();
  syndicateLoan.methods
  .instantiateLoan()
  .send({from:borrower})
  .then(result => {
    instantiateLoanDetails = result;
    console.log(result);
  });
}

const getBorrower = () => {
  web3.eth.getAccounts()
  .then(_accounts => {
    currentAccount = _accounts[0];

    syndicateLoan.methods
    .getBorrower()
    .call()
    .then(result => {
      loanAmount = result[0];
      borrower = result[1];
    })
    .then(() => {
      syndicateLoan.methods
      .getStage()
      .call()
      .then(_stage => {
        console.log("Stage: " + _stage);
        if(_stage < 2) {
          if(currentAccount !== borrower){
            $('#register_admin_form').css('display','none');
            $('#instantiate_loan').css('display','none');
            $('#risk_limit_form').css('display','block');
            $('#bank_address').text(' ' + currentAccount);
          } else {
            $('#register_admin_form').css('display','block');
            $('#instantiate_loan').css('display','block');
            $('#risk_limit_form').css('display','none');
            console.log(currentAccount + " " + borrower); 
          }  
        }
        else if(_stage == 2){
          if(currentAccount !== borrower) {
            $('#register_admin_form').hide();
            $('#instantiate_loan').hide();
            $('#risk_limit_form').hide();
            $('#voting_page').show();
            
            displayProposal();

            $('#voting_form').submit(e => {
              e.preventDefault();
              let vote = $('#vote_number').val();
              makeVote(vote);
            });

          }
        } else {//stage 3

          console.log('dfsd' + transactionDetailsCalled);

          if(transactionDetailsCalled){
            $('#register_admin_form').hide();
            $('#instantiate_loan').hide();
            $('#risk_limit_form').hide();
            $('#voting_page').hide();
            $('#sanction').hide();
            $('#loan_transaction_confirmed_container').show();

          } else {
            syndicateLoan.methods
            .getAdminBank()
            .call()
            .then((_adminBank) => {
              let adminBank = _adminBank.addr;
  
              if(currentAccount !== borrower){
                $('#register_admin_form').hide();
                $('#instantiate_loan').hide();
                $('#risk_limit_form').hide();
                $('#voting_page').show();
                displayProposal();
              }
  
              console.log("curr: " + currentAccount + " " + adminBank);
  
              if(currentAccount === adminBank) {
                $('#sanction').append(`
                    <input type="submit" value="Sanction Loan"></input>
                `);
              }
              
              $('#sanction').submit(e => {
                e.preventDefault();
                syndicateLoan.methods
                .winningProposal()
                .send({from: adminBank})
                .then(_winningProposal => {
  
                  // winningProp = _winningProposal;
                  console.log(_winningProposal);
  
                  $('#register_admin_form').hide();
                  $('#instantiate_loan').hide();
                  $('#risk_limit_form').hide();
                  $('#voting_page').hide();
                  $('#sanction').hide();
  
                  getReport(_winningProposal);
  
                  syndicateLoan.methods
                  .getWinningProposal()
                  .call({from: adminBank})
                  .then(_winning => {
                    winningProp = _winning;
                    getTransactionDetails(allProposals[_winning]);
                  });
                })
                // .then(() => {
                //   console.log(winningProp);
                //   getTransactionDetails(allProposals[winningProp]);
                // });
              });
            });
          }
        }
      });
    });
  });
};

const getReport = (instantiateLoanDetails) => {

    $('#loan_transaction_confirmed_container').show();

    console.log("inta: " + instantiateLoanDetails);

    $.each(instantiateLoanDetails, (key, value) => {
      if(key === 'logsBloom')
        return false;
      console.log(key + ' : ' + value);
      //to add key and value in html as transaction details on ethereum network
      $('#block_transaction_details_container').append(`
      <div>
        <label for="" class="form-label">${key}: </label>
        <input type="text" class="form-control" value=${value} size="44" disabled readonly>
      </div>
      `);
  });

}

const makeVote = (_vote) => {
  web3.eth.getAccounts()
  .then((_accounts) => {
    currentAccount = _accounts[0];
  }).then(() => {
    syndicateLoan.methods
    .vote(_vote)
    .send({from: currentAccount})
    .then((result) => {
      console.log(result);
    });
  });
}

const displayProposal = ()  => {
  syndicateLoan.methods
  .getProposal()
  .call()
  .then(_proposals => {
    allProposals = _proposals;
    console.log(_proposals);

    $.each(_proposals, (index, value) => {
      console.log(index + ' ' + value.addr);
      let color;
      //$.each(proposal, (index, value) => {
        if(index%2==0) {
          color = "bg-dark";
        }
        else {
          color = "bg-primary";
        }
        $("#proposal").append(`
          <div class="p-3 ${color} text-white">
            <div class="text-center text-white">
              <h4>Proposal - ${index}</h4>
            </div>
            <label class="col-form-label">Bank Name </label>
            <input type="text" class="form-control form-control-sm" value=${value.name} size="44" disabled readonly>
            <label class="col-form-label">Bank Address </label>
            <input type="text" class="form-control form-control-sm" value=${value.addr} size="44" disabled readonly>
            <label class="col-form-label">Interest Rate </label>
            <input type="text" class="form-control form-control-sm" value=${value.interest} disabled readonly>
            <label class="col-form-label">Tenure</label>
            <input type="text" class="form-control form-control-sm" value=${value.tenure} disabled readonly>
          </div>
        `)
      //});
    });
  });
}

const populateAddress = () => {
  new Web3(new Web3.providers.HttpProvider(testChainURL)).eth.getAccounts((err, _accounts) => {
    accounts = _accounts;
    $.each(accounts, (index, account) => {
      // if(index != 0)
        $('#enter_address').append(new Option(account, account));
    });
  });
}

const registerAdminBank = (loanAmount, chosenAdminBankAddress) => {
  console.log("accounts[0] : " + accounts[0]);
  console.log("chosenAdminBankAddress : " + chosenAdminBankAddress);

  syndicateLoan.methods
    .setInitials(loanAmount, chosenAdminBankAddress)
    .send({from:accounts[0]})
    .then(result => {
      console.log(result);
    });
}

const registerBank = (name, riskLimit, chosenAdminBankAddress, interest, tenure) => {

  web3.eth.getAccounts()
  .then(_accounts => {
    currentAccount = _accounts[0];
    
    console.log(riskLimit);

    //to remove
    syndicateLoan.methods
    .getAllBankDetails()
    .call({from:currentAccount})
    .then(result => {
      console.log(result)
    });
    
    syndicateLoan.methods
    .getAdminBank()
    .call({from:currentAccount})
    .then(result => {
      console.log("what: " + result);
      chosenAdminBankAddress = result.addr;
    })
    .then(() => {
      console.log(currentAccount + '----' +chosenAdminBankAddress);
  
      if(currentAccount === chosenAdminBankAddress){
        syndicateLoan.methods
        .setAdminRiskLimit(name, riskLimit, tenure, interest)
        .send({from:currentAccount})
        .then(result => {
          console.log('admin bank risk limit: ' + result);
        });
      } else {
        syndicateLoan.methods
        .registerBank(name, riskLimit, tenure, interest)
        .send({from:currentAccount})
        .then(result => {
          console.log('partner banks risk limit: ' + result);
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initWeb3()//using then here beacause initWeb3 is a asynchronous function
  .then(_web3 => {
    web3 = _web3;
    syndicateLoan = initContract();//not using then because initContract() is a synchronous function
    initApp();
  })
  .catch(e => console.log(e));
});