
// Software download...
//
//  Flow:
//      User presses "Check for SW" button on main page.
//        - renderDldView()
//          - Send "isUpdateAvailable:false" to the cloud to get ready to look for updates
//          - Set state to DLD_STATE_INIT
//
//  Phase 1: Look for updates...
//      DLD_STATE_INIT  
//        - Send "isUpdateAvailable:true" to the cloud to trigger the look for updates
//      DLD_STATE_CHECK_FOR_UPDATES
//        - Continue polling the cloud, up to 12 times, once per second.    
//        - Egress response will be handled in function ProcessEgressResponse().
//
//  Phase 2: User to select which image to update and press "Update Selected"
//        - handleDldKey()
//          - startFileDownload() - determine which image to download.
//          - Set state to DLD_STATE_GET_FROM_CLOUD
//
//  Phase 3: Download from the cloud to the phone's /Download directory 
//      DLD_STATE_GET_FROM_CLOUD
//      DLD_STATE_WAIT_ON_CLOUD
//
//  Phase 4: Download the file from the phone's directory to the Cel-Fi...
//      DLD_STATE_TO_CELFI_INIT
//      DLD_STATE_START_REQ
//      DLD_STATE_START_RSP
//      DLD_STATE_TRANSFER_REQ
//      DLD_STATE_TRANSFER_RSP
//      DLD_STATE_END_REQ
//      DLD_STATE_END_RSP
//        - call startFileDownload() to see if any more files to download.  If not wait on reset to complete.
//
//      DLD_STATE_RESET               
//      DLD_STATE_UNII_UP               // Only here if NU was reset.   Wait for UNII to be back up...
//
//      
//      DLD_STATE_CHECK_VER_5_1_9       // Special processing to send 2nd reset to NU and or CU for ver 5.1.9 or prev.
//      DLD_STATE_5_1_9_RESET               
//      DLD_STATE_5_1_9_UNII_UP         // Only here if NU was reset.   Wait for UNII to be back up...
//
//      DLD_STATE_UPDATE_LOCAL_VER
//      DLD_STATE_DONE    
//
//  Notes:
//    - Order of download is based on DldOrderArray[];
//    - If the NU is selected for download then delay 6 seconds assuming that an NU_PIC was just downloaded
//      and allow at least 5 seconds for the NU redirect to expire so the CU can talk to the NU again.
//    - If the CU is selected for download then at the end of the download when a CU reset is requested,
//      the PIC times out waiting on the response from the CU so the app must ignore the END RSP timeout.
//    - If the NU or CU are selected for download request a reset.
//
//
//     Android Speed:  Phone to Cel-Fi
//                   cnt  Tx Timer    DL Timer     Size       Time        Bytes/Sec    BAUD
//       CU PIC:          40 mS        50 mS       74094       3:30 sec    352         3,520
//                        20 mS        50 mS       74094       2:20 sec    529         5,290
//                        20 mS        25 mS       74094       2:10 sec    569         5,690
//                   4    20           25          74094       1:50
//                   7    40           25          74094       1:33        797         7,970
//
//   
//     IOS Speed:  Phone to Cel-Fi
//                   cnt  Tx Timer    DL Timer     Size       Time        Bytes/Sec    BAUD
//       CU PIC:          40 mS        25 mS       74094       1:10 sec    1058         10,580



var DldLoopIntervalHandle           = null;
var	DldState                        = DLD_STATE_DONE;
var DldTimeoutCount                 = 0;
var DldNakCount                     = 0;
var BluetoothTimeoutTimer           = null;

const DLD_STATE_INIT                = 1;
const DLD_STATE_CHECK_FOR_UPDATES   = 2;
const DLD_STATE_GET_FROM_CLOUD      = 3;
const DLD_STATE_WAIT_ON_CLOUD       = 4
const DLD_STATE_WAIT_ON_READ_FILE   = 5;
const DLD_STATE_TO_CELFI_INIT       = 6;
const DLD_STATE_START_REQ           = 7;
const DLD_STATE_START_RSP           = 8;
const DLD_STATE_TRANSFER_REQ        = 9;
const DLD_STATE_TRANSFER_RSP        = 10;
const DLD_STATE_END_REQ             = 11;
const DLD_STATE_END_RSP             = 12;
const DLD_STATE_RESET               = 13;
const DLD_STATE_UNII_UP             = 14;
const DLD_STATE_5_1_9_CHECK_VER     = 15;
const DLD_STATE_5_1_9_RESET         = 16;               
const DLD_STATE_5_1_9_UNII_UP       = 17;
const DLD_STATE_UPDATE_LOCAL_VER    = 18;
const DLD_STATE_DONE                = 19;
const DLD_STATE_WAIT_USER           = 20;

const DldStateNames                 = ["N/A", "Init", "Check for Updates", "Get From Cloud", "Wait on Cloud", "Wait on Read File", "To Cel-Fi Init", 
                                        "Start Req", "Start Rsp", "Transfer Req", "Transfer Rsp", "End Req", "End Rsp", 
                                        "Reset", "UNII UP", 
                                        "5_1_9 Check", "5_1_9 Reset", "5_1_9 UNII UP", "Update Ver", "Done", "Wait User"];

var   currentDldIndex               = -1;
const DLD_NU                        = 0;
const DLD_CU                        = 1;
const DLD_NU_PIC                    = 2;
const DLD_CU_PIC                    = 3;
const DLD_CU_BT                     = 4;
 
// The images will be downloaded in the following order...  
const DldOrderArray                 = [DLD_NU_PIC, DLD_NU, DLD_CU_BT, DLD_CU_PIC, DLD_CU];

const DLD_NAK_COUNT_MAX             = 2;
const DLD_TIMEOUT_COUNT_MAX         = 12;
const DLD_CLD_PKG_TIMEOUT_COUNT_MAX = 180;
const DLD_CLD_TIMEOUT_COUNT_MAX     = 60;
const DLD_RESET_TIMEOUT             = 25;
const DLD_UNII_UP_TIMEOUT           = 30;
const DLD_TRANSFER_LOOP_MS          = 25;

const NONE_TYPE                     = 6;


// Fixed file names to search for in the package info...
const myNuCfFileName                = "WuExecutable.sec";        
const myCuCfFileName                = "CuExecutable.sec";  
const myNuPicFileName               = "NuPICFlashImg.bin";  
const myCuPicFileName               = "CuPICFlashImg.bin";
const myBtFileName                  = "BTFlashImg.bin";


const u8AresFlashAddr               = 0xF8100000;
const u8PicFlashAddr                = 0xF8FE0000;
const u8BtFlashAddr                 = 0xF8FC0000;

var startType                       = null;
var startAddr                       = null;
var resumeAddr                      = null;

           
// var fileSystemDownloadDir           = null;
var u8FileBuff                      = null;
var actualFileLen                   = 0;
var resumeFileLen                   = 0;
var fileIdx                         = 0;
var completedFileIdx                = 0;

var fileNuCfCldId                   = 0;  
var fileCuCfCldId                   = 0;  
var fileNuPicCldId                  = 0;
var fileCuPicCldId                  = 0;
var fileBtCldId                     = 0;
var bNeedNuCfCldId                  = false;  
var bNeedCuCfCldId                  = false;  
var bNeedNuPicCldId                 = false;
var bNeedCuPicCldId                 = false;
var bNeedBtCldId                    = false;
var myDownloadFileCldId             = null
var myDownloadFileName              = null;
var myDownloadFileVer               = null;
var bReadFileSuccess                = false;
var readFileEvt                     = null;

var isUpdateAvailableFromCloud      = false;
var bGotUpdateAvailableRspFromCloud = false;
var bGotPackageAvailableRspFromCloud= false;
var bGotUpdateFromCloudTimedOut     = false;


var bNuCfUpdate                     = false;
var bCuCfUpdate                     = false;
var bNuPicUpdate                    = false;
var bCuPicUpdate                    = false;
var bBtUpdate                       = false;
var bNuPicReset                     = false;
var bCuPicReset                     = false;
var bBtReset                        = false;
var bCelFiReset                     = false;
var SubState_5_1_9                  = 0;




//.................................................................................................
function StartDownloadLoop( loopTime )
{
    if( DldLoopIntervalHandle != null )
    {
        PrintLog(1, "StartDownloadLoop(" + loopTime + ")." );        
        StopDownloadLoop();
    }
    else
    {
        PrintLog(1, "StartDownloadLoop(" + loopTime + ")" );
    }


    DldLoopIntervalHandle = setInterval(DldLoop, loopTime);
}


//.................................................................................................
function StopDownloadLoop()
{
//    PrintLog(1, "StopDownloadLoop()" );
    clearInterval(DldLoopIntervalHandle)
    DldLoopIntervalHandle = null;
}


function DownloadWho()
{
    // Determine what gets downloaded.  If the cloud version has been filled in by the ProcessEgressResponse()
    // function and the cloud version is greater than the local version then set the update flag to true.
      
    // Also determine if the NU should be reset after the NU PIC has been downloaded or
    // if the CU should be reset if the CU PIC or CU Bluetooth has been downloaded...
    bNuPicReset = false;
    bCuPicReset = false;
    bBtReset    = false;
      
      
    // Function localCompare() returns -1 if str1 < str2 (str1.localCompage(str2))...
    if( (nxtySwVerNuCfCld != swVerNoCldText) && (nxtySwVerNuCf.localeCompare(nxtySwVerNuCfCld) == -1) )
    {
        bNuCfUpdate = true;
    }
    else
    {
        bNuCfUpdate = false;
    }

    if( (nxtySwVerCuCfCld != swVerNoCldText) && (nxtySwVerCuCf.localeCompare(nxtySwVerCuCfCld) == -1) )
    {
        bCuCfUpdate = true;
    }
    else
    {
        bCuCfUpdate = false;
    }
    
    if( (nxtySwVerNuPicCld != swVerNoCldText) && (nxtySwVerNuPic.localeCompare(nxtySwVerNuPicCld) == -1) )
    {
        bNuPicUpdate = true;
        
        if( bNuCfUpdate == false )
        {
            // Since the NU is not going to be downloaded and reset automatically, then force a reset after downloading the NU PIC.
            bNuPicReset = true;
        }
    }
    else
    {
        bNuPicUpdate = false;
    }
                



    if( (nxtySwVerBtCld != swVerNoCldText) && (nxtySwVerBt.localeCompare(nxtySwVerBtCld) == -1) )
    {
        bBtUpdate = true;
        
        if( bCuCfUpdate == false )
        {
            // Since the CU is not going to be downloaded and reset automatically, then force a reset after downloading the BT.
            bBtReset = true;
        }        
    }
    else
    {
        bBtUpdate = false;
    }
    
    if( (nxtySwVerCuPicCld != swVerNoCldText) && (nxtySwVerCuPic.localeCompare(nxtySwVerCuPicCld) == -1) )
    {
        bCuPicUpdate = true;
        
        if( bCuCfUpdate == false )
        {
            // Since the CU is not going to be downloaded and reset automatically, then force a reset after downloading the CU PIC.
            bBtReset    = false;    // Make sure that the BT does not cause a reset.
            bCuPicReset = true;
        }         
    }
    else
    {
        bCuPicUpdate = false;
    }    
    
}

function DownloadError( strHead, strText, bBtMsgFail )
{
    if( bBtMsgFail )
    {
        // Slow the BT down by reducing the number of buffers written to.
        SetMaxTxPhoneBuffers(4);
    }
    
    StopDownloadLoop();
    SpinnerStop();
    UpdateStatusLine(strText);
    if( strHead != null )
    {
        showAlert( strText, strHead );
    }
    DldState = DLD_STATE_WAIT_USER;
    
    // Start the download loop in the WAIT_USER state.   
    // In the WAIT_USER state we send out a simple get status message to unclog the pipe.
    StartDownloadLoop(1000);
    
    // Set the current download in progress back to 0 so that it can start again...
    if( (currentDldIndex >= 0) && (currentDldIndex < DldOrderArray.length) )
    {
        document.getElementById("s" + DldOrderArray[currentDldIndex]).innerHTML = "0%";
    }
    
    // Change the button from "Update" to "Update-Retry"
    document.getElementById("update_id").value = "Update-Retry";
    
    
}
   


function DldBluetoothTimeout()
{

    // Ok to stop the download if we are not waiting on the user, not done and not waiting on a reset in the END_RSP state or in reset state.
    if( !((DldState == DLD_STATE_WAIT_USER) || (DldState == DLD_STATE_DONE) || (DldState == DLD_STATE_END_RSP) || (DldState == DLD_STATE_RESET)) )
    {
        StopDownloadLoop();
        SpinnerStop();
        UpdateStatusLine( "Update aborted, Bluetooth connection lost...");
        showAlert( "Bluetooth connection lost...", "Update aborted" );
        DldState = DLD_STATE_WAIT_USER;
        
        // Set the current download in progress back to 0 so that it can start again...
        if( (currentDldIndex >= 0) && (currentDldIndex < DldOrderArray.length) )
        {
            document.getElementById("s" + DldOrderArray[currentDldIndex]).innerHTML = "0%";
        }
    }    
}


function successAcquirePowerManagement()
{
    PrintLog(1, "Power management acquire success.  Autolock disabled so phone does not go to sleep." );
}

function failAcquirePowerManagement()
{
    PrintLog(1, "Power management acquire fail.  Autolock not disabled so phone may go to sleep." );
}

function successReleasePowerManagement()
{
    PrintLog(1, "Power management release success.  Autolock re-enabled so phone can go to sleep." );
}

function failReleasePowerManagement()
{
    PrintLog(1, "Power management release fail.  Autolock not re-enabled so phone may have problems going to sleep." );
}

            
var Dld = {

	// Handle the Back key
	handleBackKey: function()
	{
        if( (DldState == DLD_STATE_DONE) || (DldState == DLD_STATE_WAIT_USER) )
        {
             PrintLog(1, "Sw: SW Mode Back key pressed");
             
             // Disable the Update button
             document.getElementById("update_id").disabled = true;
             StopDownloadLoop();
             SpinnerStop();
             
             // allow device to sleep
             window.plugins.powerManagement.release( successReleasePowerManagement, failReleasePowerManagement );
         
             // Back to main menu after 500 mS to allow the powerManagement to release...
             // Without waiting was causing unit not to go into Tech mode if user pressed from main menu.
             setTimeout(app.renderHomeView, 500);
        }
        else
        {	
            showAlert("Back key not allowed!", "Update in progress...");
	 	}
	},


    // Update key pressed................................................................................................................
    handleDldKey: function()
    {
        PrintLog(1, "Update Key pressed");
    
        if( DldState == DLD_STATE_WAIT_USER )
        {
            // Kick off the process...
            currentDldIndex = -1;
            
            // Clear any Tx block...
            msgRxLastCmd = NXTY_INIT;
                
            
            showAlert("Please do not interrupt the Update!  Press ok...", "Starting update...");
            
            if( window.device.platform == androidPlatform )
            {
                // The connection interval should be 20 mS on the Android.
//                SetBluetoothTxTimer(20);
            }
            else if( window.device.platform == iOSPlatform )
            {
                // The connection interval should be 30 mS on the IOS.
//                SetBluetoothTxTimer(30);
            }

            if( bGotUpdateFromCloudTimedOut )
            {
                // Retry the get status from the cloud...
                DldState = DLD_STATE_INIT;
                StartDownloadLoop(1000);
            }
            else
            {
                // Try to download from cloud to Cel-Fi
                Dld.startFileDownload();
            }
           
        }
        else if( DldState == DLD_STATE_DONE )
        {
            showAlert("Nothing to do...", "Update Complete");
        }
        else
        {
            showAlert("Update in progress...", "Please Wait");
        }
        
    },
    
	// Determine which image to download.
	startFileDownload: function()
	{
        var idx;
            	
        var bOkToDownload = false;
        
        StopDownloadLoop();
//        SpinnerStop();        
        
        currentDldIndex++;
                    
        for( ; currentDldIndex < DldOrderArray.length; currentDldIndex++ )
        {
            idx = DldOrderArray[currentDldIndex];
            if( document.getElementById("s"+idx).innerHTML == "0%" )
            {
                break;
            }
        }


        if( currentDldIndex < DldOrderArray.length )
        {
            SpinnerStop();
                     
            // See if the NU was selected 
            if( idx == DLD_NU )
            {
    //            if( document.getElementById("ckbx_nu_id").checked )
                {
                    PrintLog(1, "NU selected for download." );
    
                    // Fill in the information necessary to transfer from the cloud to the phone                
                    myDownloadFileCldId = fileNuCfCldId;
                    myDownloadFileName  = myNuCfFileName;
                    myDownloadFileVer   = nxtySwVerNuCfCld;
    
                    // Fill in the information necessary to open the file on the phone and download to Cel-Fi
                    startType           = NXTY_SW_CF_NU_TYPE;
                    startAddr           = u8AresFlashAddr;
                    resumeAddr          = startAddr;
                    bOkToDownload       = true;                
                }
            }
            
            if( idx == DLD_CU )
            {
    //            if( document.getElementById("ckbx_cu_id").checked )
                {
                    PrintLog(1, "CU selected for download." );
                    
                    // Fill in the information necessary to transfer from the cloud to the phone                
                    myDownloadFileCldId = fileCuCfCldId;
                    myDownloadFileName  = myCuCfFileName;
                    myDownloadFileVer   = nxtySwVerCuCfCld;
    
                    // Fill in the information necessary to open the file on the phone and download to Cel-Fi
                    startType           = NXTY_SW_CF_CU_TYPE;
                    startAddr           = u8AresFlashAddr;
                    resumeAddr          = startAddr;
                    bOkToDownload       = true;                
                }
            }
            
            if( idx == DLD_NU_PIC )
            {
    //            if( document.getElementById("ckbx_nupic_id").checked )
                {
                    PrintLog(1, "NU PIC selected for download." );
                    
                    // Fill in the information necessary to transfer from the cloud to the phone
                    myDownloadFileCldId = fileNuPicCldId;
                    myDownloadFileName  = myNuPicFileName;
                    myDownloadFileVer   = nxtySwVerNuPicCld;
    
                    // Fill in the information necessary to open the file on the phone and download to Cel-Fi
                    startType           = NXTY_SW_NU_PIC_TYPE;
                    startAddr           = u8PicFlashAddr;
                    resumeAddr          = startAddr;
                    bOkToDownload       = true;                
                }
            }
            
            if( idx == DLD_CU_PIC )
            {
    //            if( document.getElementById("ckbx_cupic_id").checked )
                {
                    PrintLog(1, "CU PIC selected for download." );
                    
                    // Fill in the information necessary to transfer from the cloud to the phone
                    myDownloadFileCldId = fileCuPicCldId;
                    myDownloadFileName  = myCuPicFileName;
                    myDownloadFileVer   = nxtySwVerCuPicCld;
    
                    // Fill in the information necessary to open the file on the phone and download to Cel-Fi
                    startType           = NXTY_SW_CU_PIC_TYPE;
                    startAddr           = u8PicFlashAddr;
                    resumeAddr          = startAddr;
                    bOkToDownload       = true;
    
                }
            }
             
            
            if( idx == DLD_CU_BT )
            {   
    //            if( document.getElementById("ckbx_cubt_id").checked )
                {
                    PrintLog(1, "CU BT selected for download." );
                    
                    // Fill in the information necessary to transfer from the cloud to the phone
                    myDownloadFileCldId = fileBtCldId;
                    myDownloadFileName  = myBtFileName;
                    myDownloadFileVer   = nxtySwVerBtCld;
    
                    // Fill in the information necessary to open the file on the phone and download to Cel-Fi
                    startType           = NXTY_SW_BT_TYPE;
                    startAddr           = u8BtFlashAddr;
                    resumeAddr          = startAddr;
                    bOkToDownload       = true;                
                }        
            }
    
    
            if( bOkToDownload )
            {
                if( g_fileSystemDir != null )
                {
                    var infoText = "Downloading file: " + myDownloadFileName + " Ver: " + myDownloadFileVer + " from cloud."
                    DldState              = DLD_STATE_GET_FROM_CLOUD;
                    
                    
// jdo test - bypass getting file from cloud
//    DldState = DLD_STATE_WAIT_ON_CLOUD;
//    g_fileTransferSuccess = true;
// end of test                 
                                    
                    DldTimeoutCount       = 0;
                    
                    if( idx == DLD_NU )
                    {
                        // Wait additional time between downloading the NU PIC and the NU to
                        // clear any UART redirect issues...
                        StartDownloadLoop(6000);
                    }
                    else
                    {
                        StartDownloadLoop(1000);
                    }
                    
                    // Add version to end of file name...
                    myDownloadFileName += ("_" + myDownloadFileVer);
//                    SpinnerStart( "Please wait", infoText );
                    UpdateStatusLine(infoText);
                }
                else
                {
                    PrintLog(99, "Unable to open file system on phone." );
                }
            }
        }
        else
        {
            // End the download process...
            if( bCelFiReset )
            {
                DldState        = DLD_STATE_RESET;
            }
            else
            {
                // Should always end with a reset, but if not then just verify versions...
                DldState        = DLD_STATE_UPDATE_LOCAL_VER;
                msgRxLastCmd    = NXTY_SW_VERSION_RSP;
                nxtyCurrentReq  = 0;
            }

            StartDownloadLoop(1000);
        }
	},

    
    
	renderDldView: function() 
	{	
// NO_U        var myUniiIcon      = (bUniiStatusKnown && bUniiUp) ? szUniiIconButton + szUniiIconUp + "</button>" : szUniiIconButton + szUniiIconDown + "</button>";
        var myBluetoothIcon = isBluetoothCnx ? szBtIconButton + szBtIconOn + "</button>" : szBtIconButton + szBtIconOff + "</button>";
        var myRegIcon       = (nxtyRxRegLockStatus == 0x00) ? szRegIconButton + "</button>" : isRegistered ? szRegIconButton + szRegIconReg + "</button>" : szRegIconButton + szRegIconNotReg + "</button>";

		        
		var myHtml = 
			"<img src='img/header_dld.png' width='100%' />" +
			"<button id='back_button_id' type='button' class='back_icon' onclick='Dld.handleBackKey()'><img src='img/go_back.png'/></button>"+
			myRegIcon +
            myBluetoothIcon +
// NO_U            myUniiIcon +
            

            "<br><br>" +
            "<div class='downloadSelectContainer'>" +
            
            
            "<table id='dldTable' align='center'>" +
            "<tr> <th style='padding: 10px;' colspan='4'>Update Software Menu</th></tr>" + 
            "<tr> <th>Image</th>  <th>Cel-Fi</th> <th>Cloud</th> <th>Status</th> </tr>" +
            "<tr> <td>NU</td>     <td id='v0'></td>  <td id='c0'></td> <td id='s0'>OK</td> </tr>" +
            "<tr> <td>CU</td>     <td id='v1'></td>  <td id='c1'></td> <td id='s1'>OK</td> </tr>" +
            "<tr> <td>NU PIC</td> <td id='v2'></td>  <td id='c2'></td> <td id='s2'>OK</td> </tr>" +
            "<tr> <td>CU PIC</td> <td id='v3'></td>  <td id='c3'></td> <td id='s3'>OK</td> </tr>" +
            "<tr> <td>CU BT</td>  <td id='v4'></td>  <td id='c4'></td> <td id='s4'>OK</td> </tr>" +
            "<tr> <td style='padding: 20px;' colspan='4'><input style='font-size: 24px;' id='update_id' type='button' value='Update' onclick='Dld.handleDldKey()'></input> </td> </tr>" +
            "</table> </div>" +            
            
            

            szMyStatusLine;

		$('body').html(myHtml);  
        
        // Version info from the hardware...
        document.getElementById("v0").innerHTML = nxtySwVerNuCf;
        document.getElementById("v1").innerHTML = nxtySwVerCuCf;
        document.getElementById("v2").innerHTML = nxtySwVerNuPic;
        document.getElementById("v3").innerHTML = nxtySwVerCuPic;
        document.getElementById("v4").innerHTML = nxtySwVerBt;
        


        document.getElementById("bt_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
        document.getElementById("bt_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
        document.getElementById("reg_icon_id").addEventListener('touchstart', HandleButtonUp );     // up, adds transparency
        document.getElementById("reg_icon_id").addEventListener('touchend',   HandleButtonDown );   // down, back to normal, no transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
        
 		document.getElementById("back_button_id").addEventListener('touchstart', HandleButtonDown );
        document.getElementById("back_button_id").addEventListener('touchend',   HandleButtonUp );
        

        
        UpdateStatusLine("Checking for updates...");
        SpinnerStart( "Please wait", "Checking for updates..." );
        
        
        
        SendCloudData(  "'isUpdateAvailable':'false'" );
        
        // Make sure that we are at full download speed.
        SetMaxTxPhoneBuffers(7);
  
        
        // Blast out a download end to reset the PIC state machine just in case we start a download
        // without ending the previous download, i.e. walk away.   This caused a neg % complete
        // since the PIC would return a memory address response for a different download, Ares instead of PIC for example.
//        var u8Buff  = new Uint8Array(2);
//        u8Buff[0] = 0;                      // No reset
//        nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
        
        // Start the ball rolling...this allows the false above to go out about 1 second before the true.
        DldState = DLD_STATE_INIT;
        StartDownloadLoop(1000);
        
        currentView = "download";
	},
};



	
function DldLoop() 
{
    var i;
    var u8Buff  = new Uint8Array(20);

    if( DldState != DLD_STATE_TRANSFER_RSP )
    {
        PrintLog(1, "Download loop...DldState=" + DldStateNames[DldState] );
    }
    
    
    DldTimeoutCount++; 
    
    
    // Make sure bluetooth stays alive...
    if( isBluetoothCnx )
    {
        if( BluetoothTimeoutTimer != null )
        {
            clearTimeout(BluetoothTimeoutTimer);
            BluetoothTimeoutTimer = null;
        }
    }
    else
    {
        if( BluetoothTimeoutTimer == null )
        {
            BluetoothTimeoutTimer = setTimeout(DldBluetoothTimeout, 5000);
        }
    }
    
        
    switch( DldState )
    {
    
        //---------------------------------------------------------------------------------------
        // Phase 1: Look for updates...
        case DLD_STATE_INIT:
        {
            // Pre fill with a known value before requesting from cloud...
            nxtySwVerNuCfCld                 = swVerNoCldText;
            nxtySwVerCuCfCld                 = swVerNoCldText;
            nxtySwVerNuPicCld                = swVerNoCldText;
            nxtySwVerCuPicCld                = swVerNoCldText;
            nxtySwVerBtCld                   = swVerNoCldText;
            fileNuCfCldId                    = 0;        
            fileCuCfCldId                    = 0;  
            fileNuPicCldId                   = 0;               // future proof  
            fileCuPicCldId                   = 0;               // Future proof
            fileBtCldId                      = 0;
            bNeedNuCfCldId                   = false;  
            bNeedCuCfCldId                   = false;  
            bNeedNuPicCldId                  = false;
            bNeedCuPicCldId                  = false;
            bNeedBtCldId                     = false;
            isUpdateAvailableFromCloud       = false;
            bGotUpdateAvailableRspFromCloud  = false;
            bGotPackageAvailableRspFromCloud = false;
            

            // Blast out a download end to reset the PIC state machine just in case we start a download
            // without ending the previous download, i.e. walk away.   This caused a neg % complete
            // since the PIC would return a memory address response for a different download, Ares instead of PIC for example.
            var u8Buff  = new Uint8Array(2);
            u8Buff[0] = 0;                      // No reset
            nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
            
            // Take over the phone's auto lock feature so it does not go to sleep.
            // prevent device from sleeping
            window.plugins.powerManagement.acquire( successAcquirePowerManagement, failAcquirePowerManagement );
            
            // Send a request to the cloud to send updates...
            SendCloudData(  "'isUpdateAvailable':'true'" );
            DldState                    = DLD_STATE_CHECK_FOR_UPDATES;
            DldTimeoutCount             = 0;
            bGotUpdateFromCloudTimedOut = false;
            break; 
        }
            
        case DLD_STATE_CHECK_FOR_UPDATES:
        {
 
            if( (bGotUpdateAvailableRspFromCloud) && ((isUpdateAvailableFromCloud == false) || (isUpdateAvailableFromCloud == "false")) )
            {
                StopDownloadLoop();
                SpinnerStop();
                showAlert("No software updates pending", "Software update status");
                UpdateStatusLine("No software updates pending.");
                
                // Disable the "Update" button.
                document.getElementById("update_id").disabled = true; 
                
                DldState = DLD_STATE_DONE;
            }
            else if( (bGotUpdateAvailableRspFromCloud) && (isUpdateAvailableFromCloud) && (bGotPackageAvailableRspFromCloud) )
            {
                // Received response and handled in ProcessEgressResponse
                
                // Version info from the cloud...
                document.getElementById("c0").innerHTML = nxtySwVerNuCfCld;
                document.getElementById("c1").innerHTML = nxtySwVerCuCfCld;
                document.getElementById("c2").innerHTML = nxtySwVerNuPicCld;
                document.getElementById("c3").innerHTML = nxtySwVerCuPicCld;
                document.getElementById("c4").innerHTML = nxtySwVerBtCld;
        
       

                // Add 0% status to those available in the cloud...
                DownloadWho();
                document.getElementById("s0").innerHTML = (bNuCfUpdate)?"0%":"OK";
                document.getElementById("s1").innerHTML = (bCuCfUpdate)?"0%":"OK";
                document.getElementById("s2").innerHTML = (bNuPicUpdate)?"0%":"OK";
                document.getElementById("s3").innerHTML = (bCuPicUpdate)?"0%":"OK";
                document.getElementById("s4").innerHTML = (bBtUpdate)?"0%":"OK";


                // Make the "Update" button look pretty...
                document.getElementById("update_id").addEventListener('touchstart', HandleButtonDown );
                document.getElementById("update_id").addEventListener('touchend',   HandleButtonUp );
       
                
                StopDownloadLoop();
                SpinnerStop();
                UpdateStatusLine("Update status acquired.");
                
                DldState = DLD_STATE_WAIT_USER;
            }
            else
            {
                // Send the poll command to look for package updates...
                SendCloudPoll();
                UpdateStatusLine("Checking for updates...poll: " + DldTimeoutCount + " of " + DLD_CLD_PKG_TIMEOUT_COUNT_MAX ); 
            }
            
            if( DldTimeoutCount >= DLD_CLD_PKG_TIMEOUT_COUNT_MAX )
            {
                // after DLD_CLD_PKG_TIMEOUT_COUNT_MAX times exit stage left...
                bGotUpdateFromCloudTimedOut = true;
                DownloadError( "Timeout", "Update status not available.", false );
            }
     
/*
// jdo Test...            
if( DldTimeoutCount >= 2 )
{

    // Note that the 1062 must be changed to match the actual file ID.
    var rsp = {packages:[
                            {id:642, instructions:[{"@type":"down", id:1062, fn:"WuExecutable.sec", fp:"."}], priority:0,time:1414810929705},
                            {id:642, instructions:[{"@type":"down", id:1062, fn:"CuExecutable.sec", fp:"."}], priority:0,time:1414810929705},
                            {id:642, instructions:[{"@type":"down", id:1062, fn:"PICFlashImg.bin", fp:"."}], priority:0,time:1414810929705},
                            {id:642, instructions:[{"@type":"down", id:1062, fn:"PICFlashImg.bin", fp:"."}], priority:0,time:1414810929705},
                            {id:642, instructions:[{"@type":"down", id:1062, fn:"BTFlashImg.bin", fp:"."}], priority:0,time:1414810929705},
                        ],
                
              set:[
                    {items:{SwVerNU_CF_CldVer:"FF.FF.FF"},priority:0},
                    {items:{SwVerCU_CF_CldVer:"FF.FF.FF"},priority:0},
                    {items:{SwVerNU_PIC_CldVer:"FF.FF"},priority:0},
                    {items:{SwVerCU_PIC_CldVer:"FF.FF"},priority:0},
                    {items:{SwVer_BT_CldVer:"FF.FF"},priority:0},
                    {items:{isUpdateAvailable:true},priority:0},
                ]};
                      
    
    PrintLog( 1, "Rsp..." + JSON.stringify(rsp) );
    ProcessEgressResponse(rsp);
}
*/

            
            break; 
        }

        //---------------------------------------------------------------------------------------
        // Phase 3: Download from the cloud to the phone's /Download directory 
        case DLD_STATE_GET_FROM_CLOUD:
        {
            if( myDownloadFileCldId )
            {
                // URL looks like: "https://nextivity-sandbox-connect.axeda.com/ammp/packages/1/files/MN8!900425000022/323",
                var myDownloadUrl = myPlatformUrl + "packages/1/files/" + myModel + "!" + mySn + "/" + myDownloadFileCldId;
            
                // Path:   "file:///storage/emulated/0/Download/PicFromCloud.bin",
//            var myPhoneFilePath = "file:///storage/emulated/0/Download/" + myDownloadFileName;
                var myPhoneFilePath = g_fileSystemDir.toURL() + myDownloadFileName;
            
                DldState                    = DLD_STATE_WAIT_ON_CLOUD;
//                DldTimeoutCount             = 0;

                FileTransferDownload( myDownloadUrl, myPhoneFilePath );
            }
            else
            {
                // After download and reset user will have to try again.
                document.getElementById("s" + DldOrderArray[currentDldIndex]).innerHTML = "error";
                
                // Get the next download...
                Dld.startFileDownload();
            }
                    
            break;
        }
        
        case DLD_STATE_WAIT_ON_CLOUD:
        {
            if( g_fileTransferSuccess != null )
            {
                if( g_fileTransferSuccess )
                {
                    // File is now on the phone, download from phone to Cel-Fi
                    var infoText = "Downloading file: " + myDownloadFileName + " from phone to Cel-Fi."
//                    SpinnerStart( "Please wait", infoText );
                    UpdateStatusLine(infoText);
//                    StopDownloadLoop();


                    DldState                    = DLD_STATE_WAIT_ON_READ_FILE;
                    DldTimeoutCount             = 0;
            
                    // Get the file... The success call back will set the state to CELFI_INIT 
                    ReadFile( myDownloadFileName );   
//                    bReadFileSuccess = false;
//                    fileSystemDownloadDir.getFile( myDownloadFileName, {create:false}, gotFileEntryCB, onGetFileErrorCB );                  
                }
            }


            // If we have gone half way through our timeout, assume something failed and retry...
            if( DldTimeoutCount == (DLD_CLD_TIMEOUT_COUNT_MAX / 2) )
            {
                PrintLog( 1, "Retry to get file from cloud." );
                g_fileTransferSuccess = null;
                DldState              = DLD_STATE_GET_FROM_CLOUD;
            }



            
//            if( (DldTimeoutCount >= (DLD_CLD_TIMEOUT_COUNT_MAX)) || (g_fileTransferSuccess == false) )
            if( DldTimeoutCount >= (DLD_CLD_TIMEOUT_COUNT_MAX) )
            {
                // after so many times exit stage left...
                DownloadError( "Timeout", "Unable to download file from platform.", false );
            }
            
            break;
        }       


        case DLD_STATE_WAIT_ON_READ_FILE:
        {
            if( g_fileReadSuccess != null )
            {
                if( g_fileReadSuccess )
                {
                    // Make an array of UINT8 type.  evt.target.result holds the contents of the file.
                    u8FileBuff    = new Uint8Array(g_fileReadEvent.target.result);
                
                    actualFileLen = u8FileBuff.length;
                    resumeFileLen = u8FileBuff.length;
                    PrintLog(1, "Length of array, i.e. file is: " + actualFileLen ); 
                
                
                    // Start the actual download process to Cel-Fi
                    DldState        = DLD_STATE_TO_CELFI_INIT;
                    DldTimeoutCount = 0;
                }
                else
                {
                    document.getElementById("s" + DldOrderArray[currentDldIndex]).innerHTML = "error";
    
                    // See if there are any more files to download...
                    Dld.startFileDownload();
                }
            }
                        
            if( DldTimeoutCount >= DLD_TIMEOUT_COUNT_MAX )
            {
                // after so many times exit stage left...
                DownloadError( "Timeout", "Unable to Read File from Phone's directory.", false );
            }
            
            break;
        }       


        //---------------------------------------------------------------------------------------
        // Phase 4: Download the file from the phone's directory to the Cel-Fi...
        case DLD_STATE_TO_CELFI_INIT:
        {
            DldState              = DLD_STATE_START_REQ;
            StartDownloadLoop(500);
            DldTimeoutCount       = 0;
            fileIdx               = 0;
            completedFileIdx      = 0;
            bCelFiReset           = false;
            SubState_5_1_9        = 0;
            
            // If the file type is NU or CU then add 4 to the length since we must first send out 0xFFFFFFFF.
            if( (DldOrderArray[currentDldIndex] == DLD_NU) || (DldOrderArray[currentDldIndex] == DLD_CU) )
            {
                actualFileLen += 4;
                resumeFileLen += 4;    
            }

            
            // Fall through to the next state.... 
        }

        case DLD_STATE_START_REQ:
        {
            // Send a message to the Cel-Fi unit to start downloading...
            u8Buff[0] = startType;   
            u8Buff[1] = (resumeAddr >> 24);        // Note that javascript converts var to INT32 for shift operations.
            u8Buff[2] = (resumeAddr >> 16);
            u8Buff[3] = (resumeAddr >> 8);
            u8Buff[4] = resumeAddr;
            u8Buff[5] = (resumeFileLen >> 24);     // Note that javascript converts var to INT32 for shift operations.
            u8Buff[6] = (resumeFileLen >> 16);
            u8Buff[7] = (resumeFileLen >> 8);
            u8Buff[8] = (resumeFileLen >> 0);
            
            nxty.SendNxtyMsg(NXTY_DOWNLOAD_START_REQ, u8Buff, 9);
            DldState        = DLD_STATE_START_RSP;
            DldTimeoutCount = 0;
                        
            // Slow down just in case we get here by re-negotiating...
            StartDownloadLoop(1000);            
            break;
        }
            

            
        case DLD_STATE_START_RSP:
        {
            // Wait in this state until the Cel-Fi unit responds...
            if( window.msgRxLastCmd == NXTY_DOWNLOAD_START_RSP )
            {
                if( nxtySwDldStartRspAddr != resumeAddr )
                {
                    var myOut = "New resume addr from Ares: 0x" + nxtySwDldStartRspAddr.toString(16) + "  Wave resume addr: 0x" + resumeAddr.toString(16);
                                        
                    resumeAddr       = nxtySwDldStartRspAddr;
                    resumeFileLen    = actualFileLen - (resumeAddr - startAddr);
                    completedFileIdx = actualFileLen - resumeFileLen;

                    PrintLog(1, myOut + "  File Len: " + actualFileLen + " resumeFileLen: " + resumeFileLen + " completedFileIdx:" + completedFileIdx );
                    
                    
                    // Back to try again...
                    startType   = NONE_TYPE;
                    DldState    = DLD_STATE_START_REQ;
                }
                else
                {
                    // Move on to next state...
                    DldState        = DLD_STATE_TRANSFER_REQ;
                    DldNakCount     = 0;
                    DldTimeoutCount = 0;   
                    
                    // Crank it up so that we can respond as fast as possible.
                    StartDownloadLoop(DLD_TRANSFER_LOOP_MS);
                }             
            }
            else if( window.msgRxLastCmd == NXTY_NAK_RSP )
            {
                // Try again...   
                if( nxtyLastNakType == NXTY_NAK_TYPE_TIMEOUT )
                {
                    // If we were in the middle of downloading an NU, then the UART rediret timed out with the NAK timeout.
                    // Restart the download from the current location so the UART redirect will be thrown.
                    if( DldOrderArray[currentDldIndex] == DLD_NU )
                    {
                        startType = NXTY_SW_CF_NU_TYPE;
                    }
                    else if( DldOrderArray[currentDldIndex] == DLD_NU_PIC )
                    {
                        startType = NXTY_SW_NU_PIC_TYPE;
                    }
                }
                
                DldState = DLD_STATE_START_REQ;
                
                // Clear the Tx block...
                msgRxLastCmd = NXTY_INIT;
                
                // Give the UART redirect some time to timeout, 5 sec, before retrying...            
                StartDownloadLoop(6000);  
                
                if( DldNakCount++ >= DLD_NAK_COUNT_MAX )
                {
                    DownloadError( "Msg NAK Max.", "Failed to receive SW Download Start Rsp Msg from Cel-Fi device.", false );
                }
            }
            
            if( DldTimeoutCount >= DLD_TIMEOUT_COUNT_MAX )
            {
                // after so many times exit stage left...
                DownloadError( "Timeout.", "No SW Download Start Response Msg from Cel-Fi device.", false );
            }
            break;
        }

                    
        case DLD_STATE_TRANSFER_REQ:
        {
            DldTransferReq();
            break;
        }
            
        case DLD_STATE_TRANSFER_RSP:
        {
            // Wait in this state until the Cel-Fi unit responds...
            if( window.msgRxLastCmd == NXTY_DOWNLOAD_TRANSFER_RSP )
            {
                // Calculate the completed file index regardless of whether or not a continue, i.e. 1, was sent back.
                completedFileIdx = fileIdx;
                                
                // See if the Continue flag was set to 1, if so then continue...
                if( nxtySwDldXferRspCont == 1 )
                {
//                    completedFileIdx = fileIdx;

                    var percentComplete = Math.round(fileIdx/actualFileLen * 100);
//                    PrintLog(1, "Download loop...DldState=" + DldStateNames[DldState] + "  " + percentComplete + "%" );
                    UpdateStatusLine(myDownloadFileName + "..." + percentComplete + "%" ); 
                
                    // Update in the table...
                    document.getElementById("s" + DldOrderArray[currentDldIndex]).innerHTML = percentComplete + "%"; 
                    
                    if( completedFileIdx >= actualFileLen )
                    { 
                        // end transfer
                        DldState = DLD_STATE_END_REQ;
                    }
                    else
                    {
                        // transfer some more...
                        DldTransferReq();
                    }
                    DldTimeoutCount = 0;
                    DldNakCount     = 0;
                }
                else
                {
                    PrintLog(1, "Download transfer rsp: Continue was set to 0 which means to re-calculate the address.");
                
                    // Continue was set to 0 which means to re calculate the start...
                    startType       = NONE_TYPE;
                    resumeAddr      = startAddr + completedFileIdx;
                    resumeFileLen   = actualFileLen - (resumeAddr - startAddr);
                    
                    DldState = DLD_STATE_START_REQ;
                }     
            }


            // Logic to try to recover from any download error.
            // If no transfer response within 1 second
            //   Start sending status requests every 200 mS up to 11.
            //   If the PIC responds with a status response then we know that we have resynced so 
            //   we can resume transfering data.  Ignore NAKs during this process and
            //   consider only timeouts which should catch NAKs as well.

            if( DldTimeoutCount == (1000 / DLD_TRANSFER_LOOP_MS) )      // 1 second timeout...
            {
                PrintLog(1, "Download transfer 1 second timeout, try to resync with status messages.  Fileidx=" + completedFileIdx + " / " + actualFileLen);
                
                // Send a message every 200 mS until we resync.
                StartDownloadLoop(200);
                
                msgRxLastCmd   = NXTY_INIT;
                nxtyCurrentReq = NXTY_SW_CU_PIC_TYPE;
                u8Buff[0]      = nxtyCurrentReq;                
                nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
            }  

            // Try up to 11 times to resync by sending a status message every 200 mS.
            // 11 12-byte status messages is 132 bytes, the size of one transfer message.
            if( DldTimeoutCount > (1000 / DLD_TRANSFER_LOOP_MS) )      
            {   
                if( DldTimeoutCount < ((1000 / DLD_TRANSFER_LOOP_MS) + 11) )      
                {   
                    if( window.msgRxLastCmd == NXTY_SW_VERSION_RSP )
                    {
                        PrintLog(1, "Download transfer 1 second timeout has resynced, continue sending download data.");
                        
                        // Set the DldTimeoutCount so that we do not come back to this logic.
                        DldTimeoutCount = (1000 / DLD_TRANSFER_LOOP_MS) + 11;
                        
                        // The phone and PIC have resynced so lets try to send download data again starting where we left off.
                        // Try to send the download transfer data again...
                        DldState = DLD_STATE_TRANSFER_REQ;
                        StartDownloadLoop(DLD_TRANSFER_LOOP_MS);
                    }
                    else
                    {            
                        // Send another message and look for the rsp.
                        msgRxLastCmd   = NXTY_INIT;
                        nxtyCurrentReq = NXTY_SW_CU_PIC_TYPE;
                        u8Buff[0]      = nxtyCurrentReq;                
                        nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                    }
                }
                else if( DldTimeoutCount == ((1000 / DLD_TRANSFER_LOOP_MS) + 11) )
                {
                    // Reset the loop timer so the final timeout is calculated correctly.
                    StartDownloadLoop(DLD_TRANSFER_LOOP_MS);
                }                
            }  

            if( DldTimeoutCount >= ((10000 / DLD_TRANSFER_LOOP_MS)) )   // 10 second timeout
            {
                // after so many times exit stage left...
                DownloadError( "Timeout.", "Failed to receive SW Download Transfer Response Msg from Cel-Fi device.", true );
            }
            
            break;
        }            
            
            
        case DLD_STATE_END_REQ:
        {
            if( (DldOrderArray[currentDldIndex] == DLD_NU) || 
                (DldOrderArray[currentDldIndex] == DLD_CU) ||
                ((DldOrderArray[currentDldIndex] == DLD_NU_PIC) && (bNuPicReset))   ||
                ((DldOrderArray[currentDldIndex] == DLD_CU_PIC) && (bCuPicReset))   ||
                ((DldOrderArray[currentDldIndex] == DLD_CU_BT)  && (bBtReset))      )
            {
                u8Buff[0]   = 1;  // RESET
                bCelFiReset = true;
                SpinnerStart( "Please wait", "Reseting system..." );                
            }
            else
            {
                u8Buff[0] = 0;  // No reset
            } 
            nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
            DldState = DLD_STATE_END_RSP; 
            
            // Slow it down again...
            StartDownloadLoop(1000); 
            break;
        }

        case DLD_STATE_END_RSP:
        {
            // Wait in this state until the Cel-Fi unit responds...
            if( window.msgRxLastCmd == NXTY_DOWNLOAD_END_RSP )
            {
                UpdateStatusLine("Update Complete... " ); 

                
                // Get the next download...
                Dld.startFileDownload();
            }
            else if( window.msgRxLastCmd == NXTY_NAK_RSP )
            {
                if( (bCelFiReset) && (nxtyLastNakType == NXTY_NAK_TYPE_TIMEOUT) )
                {
                    // If the NU or CU was just reset then the PIC may not be able to communicate and we
                    // either timeout here or timeout below.  Either way we will call it done. 
                    UpdateStatusLine("Update Complete... " ); 
                
                    // Get the next download...
                    Dld.startFileDownload();
 
                }
                else
                {
                    // Try again...
                    DldState = DLD_STATE_END_REQ;
    
                    // Clear the Tx block...
                    msgRxLastCmd = NXTY_INIT;
                }
                
                
                if( DldNakCount++ >= DLD_NAK_COUNT_MAX )
                {
                    DownloadError( "Msg NAK Max.", "Failed to receive SW Download End Response Msg from Cel-Fi device.", false );
                }
            }
               
            if( bCelFiReset )
            {                
                UpdateStatusLine("Waiting for reset... " + (DLD_RESET_TIMEOUT - DldTimeoutCount) );
            }
                                     
            if( DldTimeoutCount >= DLD_TIMEOUT_COUNT_MAX )
            {
                if( bCelFiReset )
                {
                    // If the NU or CU was just reset then the PIC may not be able to communicate and we
                    // either timeout here or timeout below.  Either way we will call it done. 
                
                    // Get the next download...
                    Dld.startFileDownload();
                }
                else
                {
                    // after x times exit stage left...
                    DownloadError( "Timeout.", "Failed to receive SW Download End Response Msg from Cel-Fi device.", false );
                }
            }
            break;
        }

        case DLD_STATE_RESET:
        {
            UpdateStatusLine("Waiting for reset... " + (DLD_RESET_TIMEOUT - DldTimeoutCount) );
            
            if( DldTimeoutCount >= DLD_RESET_TIMEOUT )
            {
                // Move on to the next state...
                if( bNuCfUpdate || bNuPicUpdate )
                {
                    // If either NU image was updated then wait on the UNII to be up before going on...
                    DldState        = DLD_STATE_UNII_UP;
                    bUniiUp         = false;
                    SpinnerStart( "Please wait", "Waiting for Unit to Unit comm..." ); 
                }
                else
                {
                    // Do not wait on the UNII to be up...
                    DldState        = DLD_STATE_5_1_9_CHECK_VER;
                }
                DldTimeoutCount = 0;
                
                // Clear the Tx block...
                msgRxLastCmd = NXTY_INIT;
            }
            break;
        }

        case DLD_STATE_UNII_UP:
        {
            if( bUniiUp )
            {
                DldState        = DLD_STATE_5_1_9_CHECK_VER;
                DldTimeoutCount = 0;
            }
            else
            {
                UpdateStatusLine("Waiting for Unit to Unit comm... " + (DLD_UNII_UP_TIMEOUT - DldTimeoutCount) );
            
                // Check to see if UNII is up...
                nxtyCurrentReq  = NXTY_SEL_PARAM_LINK_STATE;
                u8Buff[0] = 0x02;                       // Check CU   
                u8Buff[1] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 1: LinkState
                u8Buff[2] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 2: LinkState
                nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3); 
            }            

            if( DldTimeoutCount >= DLD_UNII_UP_TIMEOUT )
            {
                // after x times exit stage left...
                DownloadError( "Timeout.", "Waiting for communications between Cel-Fi devices...", false );
            }            

            break;
        }





        // 5_1_9 states are due to a problem with download and reset for version 5.1.9 and previous.
        // Solution is to reset a 2nd time...
        case DLD_STATE_5_1_9_CHECK_VER:
        {
            // Check if the local CU or NU version is 5.1.9 or previous, if so then reset.
            // localeCompare will return -1 if nxtySwVerNuCf < "0x0501000A".
            var bNuSecondResetRequired = ((bNuCfUpdate) && (nxtySwBuildIdNu.localeCompare("0x0501000A") == -1))?true:false;
            var bCuSecondResetRequired = ((bCuCfUpdate) && (nxtySwBuildIdCu.localeCompare("0x0501000A") == -1))?true:false;
            
            if( bNuSecondResetRequired || bCuSecondResetRequired )
            {
                PrintLog( 1, "NU/CU 5.1.9 Check: NU 2nd Reset Req: " + bNuSecondResetRequired + "  CU 2nd Reset Req: " + bCuSecondResetRequired );            
                if( bNuSecondResetRequired )
                { 
                    if( SubState_5_1_9 == 0 )
                    {
                        PrintLog( 1, "NU 5.1.9 Check: SubState 5.1.9 = 0 - Redirect UART to NU" );
                     
                        // 1st: set UART redirect to the NU with a dummy read 
                        u8Buff[0] = 0x01;                               // Redirect...   
                        u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
                        u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
                        u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
                        u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
                        u8Buff[5] = 0xDE;                               // Set value to 0xDEADBEEF to read register
                        u8Buff[6] = 0xAD;
                        u8Buff[7] = 0xBE;
                        u8Buff[8] = 0xEF;
                        nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);
                        SubState_5_1_9  = 1;
                        DldTimeoutCount = 0;
                    }
                    else if( SubState_5_1_9 == 1 )
                    {
                        PrintLog( 1, "NU 5.1.9 Check: SubState 5.1.9 = 1 - Issue Download END Req to force a reset." );
                        if( window.msgRxLastCmd == NXTY_CONTROL_WRITE_RSP )
                        {
                            // 2nd:  Issue a download END REQ message 
                            u8Buff[0]   = 1;  // RESET
                            nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
                            SubState_5_1_9  = 2;
                            DldTimeoutCount = 0;
                            SpinnerStart( "Please wait", "Reseting system..." ); 
                        }
                        else if( window.msgRxLastCmd == NXTY_NAK_RSP )
                        {
                            // retry...
                            SubState_5_1_9 = 0;
                        }
                    
                    }
                    else if( SubState_5_1_9 == 2 )
                    {
                        PrintLog( 1, "NU 5.1.9 Check: SubState 5.1.9 = 2 - Wait for Download END RSP or a timeout." );
                    
                        UpdateStatusLine("Waiting for reset... " + (DLD_RESET_TIMEOUT - DldTimeoutCount) );
                        
                        if( window.msgRxLastCmd == NXTY_DOWNLOAD_END_RSP )
                        {
                            // Don't expect to get this since we just reset the NU...
                            // 3rd:  See if the CU version is 5.1.9 or prev and reset it as well.
                            if( bCuSecondResetRequired )
                            { 
                                u8Buff[0]   = 1;  // RESET
                                nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
                            }

                            DldState        = DLD_STATE_5_1_9_RESET;
                            DldTimeoutCount = 0;
                        }
                        else if( window.msgRxLastCmd == NXTY_NAK_RSP )
                        {
                            // Most likely a timeout so blast ahead...
                            if( bCuSecondResetRequired )
                            { 
                                u8Buff[0]   = 1;  // RESET
                                nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
                            }

                            DldState        = DLD_STATE_5_1_9_RESET;
                            DldTimeoutCount = 0;
                        }
                    
                    }
                }
                else
                {
                    PrintLog( 1, "CU 5.1.9 Check" );
                
                    // Not the NU so it must have been just the CU...Reset...
                    u8Buff[0]   = 1;  // RESET
                    nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
                    DldState        = DLD_STATE_5_1_9_RESET;
                    DldTimeoutCount = 0;
                }
                
            }
            else
            {
                // No need for 2nd reset on the NU or CU so get latest versions...
                DldState        = DLD_STATE_UPDATE_LOCAL_VER;
                msgRxLastCmd    = NXTY_SW_VERSION_RSP;
                nxtyCurrentReq  = 0;
            }
            
            // Wait additional time for NAK timeout if needed...
            if( DldTimeoutCount >= (DLD_TIMEOUT_COUNT_MAX * 2) )
            {
                // If a 2nd reset was needed just move on to the reset state
                if( bNuSecondResetRequired || bCuSecondResetRequired )
                {
                    // See if we need to reset the CU as well but have not...
                    if( bCuSecondResetRequired && (DldState != DLD_STATE_5_1_9_RESET) )
                    { 
                        u8Buff[0]   = 1;  // RESET
                        nxty.SendNxtyMsg(NXTY_DOWNLOAD_END_REQ, u8Buff, 1);
                        DldTimeoutCount = 0;
                    }
                    DldState        = DLD_STATE_5_1_9_RESET;

                }
                else
                {
                    // after so many times exit stage left...
                    DownloadError( "Timeout.", "Failed to reset Cel-Fi device (5.1.9).", false );
                }
            }
            break;
        }

        case DLD_STATE_5_1_9_RESET:
        {
            UpdateStatusLine("Waiting for reset... " + (DLD_RESET_TIMEOUT - DldTimeoutCount) );
            
            if( DldTimeoutCount >= DLD_RESET_TIMEOUT )
            {
                // Move on to the next state...
                if( bNuCfUpdate || bNuPicUpdate )
                {
                    // If either NU image was updated then wait on the UNII to be up before going on...
                    DldState        = DLD_STATE_5_1_9_UNII_UP;
                    bUniiUp         = false;
                    DldTimeoutCount = 0;
                    SpinnerStart( "Please wait", "Waiting for Unit to Unit comm..." ); 
                }
                else
                {
                    // Do not wait on the UNII to be up...
                    DldState        = DLD_STATE_UPDATE_LOCAL_VER;
                    msgRxLastCmd    = NXTY_SW_VERSION_RSP;
                    nxtyCurrentReq  = 0;
                }
                DldTimeoutCount = 0;
                
                                
                // Clear the Tx block...
                msgRxLastCmd = NXTY_INIT;
            }
            break;
        }

        case DLD_STATE_5_1_9_UNII_UP:
        {
            if( bUniiUp )
            {
                DldState        = DLD_STATE_UPDATE_LOCAL_VER;
                msgRxLastCmd    = NXTY_SW_VERSION_RSP;
                nxtyCurrentReq  = 0;
            }
            else
            {
                UpdateStatusLine("Waiting for Unit to Unit comm... " + (DLD_UNII_UP_TIMEOUT - DldTimeoutCount) );
            
                // Check to see if UNII is up...
                nxtyCurrentReq  = NXTY_SEL_PARAM_LINK_STATE;
                u8Buff[0] = 0x02;                       // Check CU   
                u8Buff[1] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 1: LinkState
                u8Buff[2] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 2: LinkState
                nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3); 
            }            

            if( DldTimeoutCount >= DLD_UNII_UP_TIMEOUT )
            {
                // after x times exit stage left...
                DownloadError( "Timeout.", "Waiting for communications between Cel-Fi devices...", false );
            }            

            break;
        }


            
        case DLD_STATE_UPDATE_LOCAL_VER:
        {
            if( msgRxLastCmd == NXTY_SW_VERSION_RSP )
            {
                DldNakCount     = 0;
                DldTimeoutCount = 0;
            
                if( nxtyCurrentReq == 0 )
                {
                    SpinnerStop();
                    UpdateStatusLine("Updating BT Version Info... " );
                
                    // Start the ball rolling by asking for the CU BT
                    nxtyCurrentReq = NXTY_SW_BT_TYPE;
                    u8Buff[0]      = nxtyCurrentReq;
                    nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                    
                    StartDownloadLoop(1000); 
                }
                else if( nxtyCurrentReq == NXTY_SW_BT_TYPE )
                {
                    document.getElementById("v4").innerHTML = nxtySwVerBt;                    
                
                    UpdateStatusLine("Updating CU Version Info... " );
                    nxtyCurrentReq = NXTY_SW_CF_CU_TYPE;
                    u8Buff[0]      = nxtyCurrentReq;
                    nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                }
                else if( nxtyCurrentReq == NXTY_SW_CF_CU_TYPE )
                {
                    document.getElementById("v1").innerHTML = nxtySwVerCuCf;                   

                    UpdateStatusLine("Updating CU PIC Version Info... " );
                    nxtyCurrentReq = NXTY_SW_CU_PIC_TYPE;
                    u8Buff[0]      = nxtyCurrentReq;
                    nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                }
                else if( nxtyCurrentReq == NXTY_SW_CU_PIC_TYPE )
                {
                    document.getElementById("v3").innerHTML = nxtySwVerCuPic;                  
                
                    // Only update the NU versions if either were downloaded...
                    if( (bNuCfUpdate || bNuPicUpdate) && bUniiUp )
                    {
                        UpdateStatusLine("Updating NU Version Info... " );
                        nxtyCurrentReq = NXTY_SW_CF_NU_TYPE;
                        u8Buff[0]      = nxtyCurrentReq;
                        nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                    }
                    else
                    {
                        DldState = DLD_STATE_DONE;
                    }
                }
                else if( nxtyCurrentReq == NXTY_SW_CF_NU_TYPE )
                {
                    document.getElementById("v0").innerHTML = nxtySwVerNuCf;
                
                    UpdateStatusLine("Updating NU PIC Version Info... " );
                    nxtyCurrentReq = NXTY_SW_NU_PIC_TYPE;
                    u8Buff[0]      = nxtyCurrentReq;
                    nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                }
                else if( nxtyCurrentReq == NXTY_SW_NU_PIC_TYPE )
                {
                    document.getElementById("v2").innerHTML = nxtySwVerNuPic;  
                    DldState = DLD_STATE_DONE;                
                }                

            }
            else if( window.msgRxLastCmd == NXTY_NAK_RSP )
            {
                if( nxtyLastNakType != NXTY_NAK_TYPE_UNII_NOT_UP )
                {
                    // Try again...
                    if( nxtyCurrentReq == NXTY_SW_CF_NU_TYPE )
                    {
                        StartDownloadLoop(6000);
                    }  
                    
                    u8Buff[0]      = nxtyCurrentReq;
                    nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8Buff, 1);
                }
                else
                {
                    DldState = DLD_STATE_DONE;
                }
                
                if( DldNakCount++ >= DLD_NAK_COUNT_MAX )
                {
                    DownloadError( "Msg NAK Max.", "Failed to receive SW Ver Rsp Msg from Cel-Fi device.", false );
                }
            }
                         
            if( DldTimeoutCount >= DLD_TIMEOUT_COUNT_MAX )
            {
                // after x times exit stage left...
                DownloadError( "Timeout.", "Failed to receive SW Ver Response Msg from Cel-Fi device.", false );
            }            
            

            break;
        }


        case DLD_STATE_DONE:
        {
            UpdateStatusLine("Update complete... " );
            StopDownloadLoop();
            SpinnerStop();
            
            // If anyone was downloaded then put a big happy button up...
            if( bNuCfUpdate || bCuCfUpdate || bNuPicUpdate || bCuPicUpdate || bBtUpdate )
            {
                showAlert( "Software has been updated.", "Update Complete!" );
            }            

            
            break;
        }
        
        
        case DLD_STATE_WAIT_USER:
        {
            UpdateStatusLine("Select Update to continue... " );
//            StopDownloadLoop();
            SpinnerStop();
            
            // Send out a message every second just in case the PIC and BT need to get re-aligned...
            // Clear any Tx block first...
            msgRxLastCmd = NXTY_INIT;
            nxty.SendNxtyMsg(NXTY_STATUS_REQ, null, 0);
            
            break;
        }
        
        
        default:
        {
            StopDownloadLoop();
            UpdateStatusLine("Invalid Update State.");
            break;
        }
        
    }   // end switch
}
	
	
function DldTransferReq() 
{
    var chunkSize;
    var u8Buff  = new Uint8Array(NXTY_MED_MSG_SIZE);
    
    chunkSize = NXTY_DOWNLOAD_MAX_SIZE;
    fileIdx   = completedFileIdx;

    // See if we can push out a full load...        
    if( (fileIdx + NXTY_DOWNLOAD_MAX_SIZE) > actualFileLen )
    {
        chunkSize = actualFileLen - fileIdx;
    }
    u8Buff[0] = chunkSize;

    
    if( (DldOrderArray[currentDldIndex] == DLD_NU) || (DldOrderArray[currentDldIndex] == DLD_CU) )
    {
        // Start with 1 to account for u8Buff[0] set to chunkSize
        i = 1;
        
        // For NU and CU the 1st 4 bytes must be 0xFFFFFFFF and the size must be decreased by 4.
        if( fileIdx == 0 )
        {   
            var size;
                 
            u8Buff[i++] = 0xFF;                     // dword[0]
            u8Buff[i++] = 0xFF;
            u8Buff[i++] = 0xFF;
            u8Buff[i++] = 0xFF;
            u8Buff[i++] = u8FileBuff[fileIdx++];    // dword[1]
            u8Buff[i++] = u8FileBuff[fileIdx++];
            u8Buff[i++] = u8FileBuff[fileIdx++];
            u8Buff[i++] = u8FileBuff[fileIdx++];
            
            // Treat the size as little endian...
            size =  u8FileBuff[fileIdx++];
            size |= (u8FileBuff[fileIdx++] << 8);
            size |= (u8FileBuff[fileIdx++] << 16);
            size |= (u8FileBuff[fileIdx++] << 24);
            
            // Use the triple right shift operator to convert from signed to unsigned.                           
            size >>>= 0;
            
            // Subtract 4...
            size    -= 4; 

            // Load it back into the buffer...
            u8Buff[i++] = (size)       & 0xFF;
            u8Buff[i++] = (size >> 8)  & 0xFF;
            u8Buff[i++] = (size >> 16) & 0xFF;
            u8Buff[i++] = (size >> 24) & 0xFF;

            // Finish the chunk...
            for( ; i <= chunkSize; i++ )
            {
                u8Buff[i] = u8FileBuff[fileIdx++];
            }
            
            // Compensate for the additional 4 bytes...
            fileIdx += 4;
        }
        else
        {
            for( i = 1; i <= chunkSize; i++ )
            {
                u8Buff[i] = u8FileBuff[fileIdx - 4];
                fileIdx++;
            }
        }
    }
    else
    {
        
        // Start with 1 to account for u8Buff[0] set to chunkSize
        for( i = 1; i <= chunkSize; i++ )
        {
            u8Buff[i] = u8FileBuff[fileIdx++];
        }
    }
    
    
    // Send a message to the Cel-Fi unit with data...
    nxty.SendNxtyMsg(NXTY_DOWNLOAD_TRANSFER_REQ, u8Buff, (chunkSize + 1));
    DldState = DLD_STATE_TRANSFER_RSP;
}

// End of operational code...
/////////////////////////////////////////////////////////////////////////////////////////////////////////////



