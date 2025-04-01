/**
 * 用于测试环境的模拟部署配置数据
 */
const mockDeploymentData = {
  "network": "test",
  "timestamp": "2025-04-01T05:12:50.436Z",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "contracts": {
    "system": "0xBEc49fA140aCaA83533fB00A2BB19bDdd0290f25",
    "facade": "0xD84379CEae14AA33C123Af12424A37803F885889",
    "rolemanager": "0xD8a5a9b31c3C0232E196d518E89Fd8Bf83AcAd43",
    "propertymanager": "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD",
    "tokenfactory": "0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B",
    "tradingmanager": "0x51A1ceB83B83F1985a81C295d1fF28Afef186E02",
    "rewardmanager": "0x172076E0166D1F9Cc711C77Adf8488051744980C",
    "testtoken": "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2"
  },
  "systemStatus": "1",
  "deployMethod": "step-by-step",
  "implementations": {
    "system": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    "facade": "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
    "rolemanager": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "propertymanager": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "tokenfactory": "0x9A676e781A523b5d0C0e43731313A708CB607508",
    "tradingmanager": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "rewardmanager": "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  }
};

module.exports = { mockDeploymentData }; 