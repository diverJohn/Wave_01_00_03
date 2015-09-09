// Settings...
//
//
//
//      On Entry Flow.........
//          - User selects Antenna from main menu...
//          1) Read global flags to determine status of Auto/Manual.
//          2) Read Ant status
//
//      Manual Ant selection Flow.........
//          - User makes antenna selection..
//          - Ok to UART redirect to NU, i.e. 5 second timer expired...
//            - Control Write Cmd 0x0C: Write to Global Flags value to set hardware.  0xF1ACxxxx
//              - Disable all radio buttons.
//            - Control Write Cmd 0x0C: Read from Global Flags until value and 0xFFFFFF00 is 0.   
//            - Read Sys Info Cmd 0x01: Read SelParamReg AntennaStatus.
//              - Enable radio buttons. 
//            - Control Write Cmd 0x0C: Read from Global Flags again to close redirect to NU and get latest status. 
//          - Start 5 second UART redirect timer. 


var StgLoopIntervalHandle       = null;
var	StgState                    = null;
var StgTimeoutCount             = 0;
var antCode                     = 0;
var bOkToRedirectUart           = true;
var uartRedirectTimeout         = null;
var bAntChangeInProgress        = false;
var checkUniiStatusStgTimer     = null;


const   MAX_bdS               = 44;
const   bdFreqMHz             = [   0, 2100, 1900, 1800, 1700,  850,    6, 2600,  900, 1800, 1700,  // bds  0 to 10
                                         1500,  700,  700,  700,   15,   16,  700,  850,  850,  800,  // bds 11 to 20
                                         1500, 3500, 2000, 1600, 1900,  850,  850,  700,  700, 2300,  // bds 21 to 30   
                                          450, 1500, 2100, 2100, 1900, 1900, 1900, 2600, 1900, 2300,  // bds 31 to 40
                                         2500, 3500, 3700,  700 ];                                    // bds 41 to 44
const   STG_LOOP_COUNT_MAX      = 25;


const   STG_STATE_READ_GLOBAL_FLAGS_ON_ENTRY    = 1;
const   STG_STATE_READ_ANT_STATUS_ON_ENTRY      = 2;
const   STG_STATE_WAIT_FOR_ANT_STATUS_ON_ENTRY  = 3;
const   STG_STATE_SET_ANT                       = 4;
const   STG_STATE_READ_GLOBAL_FLAGS             = 5;
const   STG_STATE_WAIT_FOR_ANT_STATUS           = 6;

const   GLOBAL_FLAGS_AUTO_ANT_BIT               = 0x20;     // when set do automatic antenna selection...
const   ANT_STATUS_NO_EXT                       = 0xFFFFFFFF;

// Called at the end of a 5 second timeout to allow the UART to be redirected...
function RedirectUartTimeout()
{
    bOkToRedirectUart = true;
    PrintLog(1,"bOkToRedirectUart set to true" );    
}

/*
// NO_U

// CheckUniiStatusStg....................................................................................
function CheckUniiStatusStg()
{
    var u8Buff  = new Uint8Array(20);
 
    if( currentView == "settings" )
    {
        // Check to see if UNII is up...
        PrintLog(1, "Ant: Check UNII status..." );        
        nxtyCurrentReq  = NXTY_SEL_PARAM_LINK_STATE;
        u8Buff[0] = 0x02;                       // Check CU   
        u8Buff[1] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 1: LinkState
        u8Buff[2] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 2: LinkState
        nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3); 
    
        // Return here in 1 second....
        checkUniiStatusStgTimer = setTimeout(CheckUniiStatusStg, 1000);
    }
}
*/


// Start setting the antenna in hardware...
//  |--- Read AntennaStatus ---------| |---- Set GlobalFlags -----|
//                     Read Baand      set EXT ANT      Set INT ant
// A   bit 7:  0=ext   bits 6 to 0     0xF1AC0200       0xF1AC0002
// B   bit 15: 0=ext   bits 14 to 8    0xF1AC0400       0xF1AC0004
// C   bit 23: 0=ext   bits 22 to 16   0xF1AC0800       0xF1AC0008
// D   bit 31: 0=ext   Bits 30 to 24   0xF1AC1000       0xF1AC0010

// Set Auto/Manual Antenna control in GlobalFlags...
//    Manual           Auto
// 0xF1AC2000       0xF1AC0020
//
function ant(code)
{
    switch(code)
    {
        case 0x0020:   PrintLog(1, "Set Ant Auto" );        break;
        case 0x2000:   PrintLog(1, "Set Ant Manual" );      break;
        case 0x0002:   PrintLog(1, "Set Ant A Internal" );  break;
        case 0x0004:   PrintLog(1, "Set Ant B Internal" );  break;
        case 0x0008:   PrintLog(1, "Set Ant C Internal" );  break;
        case 0x0010:   PrintLog(1, "Set Ant D Internal" );  break;
        case 0x0200:   PrintLog(1, "Set Ant A External" );  break;
        case 0x0400:   PrintLog(1, "Set Ant B External" );  break;
        case 0x0800:   PrintLog(1, "Set Ant C External" );  break;
        case 0x1000:   PrintLog(1, "Set Ant D External" );  break;
    }
    
    
    antCode = 0xF1AC0000 | code;
    antCode >>>= 0; // convert to unsigned since 0xF is MSB
    PrintLog(1, "Set global flags: 0x" + antCode.toString(16) );
    SpinnerStart("Please wait.", "Setting antenna configuration...");
    UpdateStatusLine("Setting antenna configuration...");
                
    // Disable all radio buttons to keep user from changing while 
    // we are trying to set the hardware...
    disableAntButtons();

    // Clear the 1 second UNII timer...
    // Note that the StgLoop will actually start in 1 second due to the call below so any pending UNII check responses should be cleared by then... 
// NO_U    clearTimeout(checkUniiStatusStgTimer);

    StgTimeoutCount       = 0;
    StgState              = STG_STATE_SET_ANT;
    bAntChangeInProgress  = true;
    StgLoopIntervalHandle = setInterval(StgLoop, 1000);
}



//.............................................................................................
function disableAntButtons()
{
    var i;

    // Disable all radio buttons to keep user from changing while 
    // we are trying to set the hardware...
    document.getElementById("ba_id").disabled = true;    
    document.getElementById("bm_id").disabled = true;    
    
    for( i = 0; i < 4; i++ )
    {
        document.getElementById("bi_id"+i).disabled = true;
        document.getElementById("be_id"+i).disabled = true;
    }
}

//.............................................................................................
function updateAntButtons()
{
    var i;
    var bIntAnt;
    var ubd;
    var uTemp;        

    document.getElementById("ba_id").disabled = false;    
    document.getElementById("bm_id").disabled = false;    

            
    // Update Auto/Manual
    if( nxtyCtrlWriteRsp & GLOBAL_FLAGS_AUTO_ANT_BIT )
    {
        // Set Auto..
        document.getElementById("ba_id").checked = true;
    }
    else
    {
        // Set Manual..
        document.getElementById("bm_id").checked = true;
    }
    
    uTemp = nxtySelParamRegOneRsp;
    
    for( i = 0; i < 4; i++ )
    {   
        bIntAnt = false;
        ubd = uTemp & 0xFF;
        
        // See if there is a bd defined...
        if( ubd )
        {
            // Make sure the radio buttons are enabled...
            document.getElementById("bi_id"+i).disabled = false;
            document.getElementById("be_id"+i).disabled = false;
            
            // Check bit 7 which contains ant info.  0=ext, 1=int
            if( ubd & 0x80 )
            {
                bIntAnt = true;
                ubd   &= 0x7F;
            }
        
            if( ubd <= MAX_bdS )
            {
                document.getElementById("b"+i).innerHTML = "bd: " + ubd + " (" + bdFreqMHz[ubd] + ")";
            }
            else
            {
                document.getElementById("b"+i).innerHTML = "bd: " + ubd;
            }
            
            if( bIntAnt )
            {
                document.getElementById("bi_id"+i).checked = true;
            }
            else
            {
                document.getElementById("be_id"+i).checked = true;
            }
            
    
            // Disable selection if auto mode...
            if( nxtyCtrlWriteRsp & GLOBAL_FLAGS_AUTO_ANT_BIT )
            {
                document.getElementById("bi_id"+i).disabled = true;
                document.getElementById("be_id"+i).disabled = true;
                
                // Uncheck radio buttons for now until Ares software is updated 
                // to provide visibility during auto mode.
                document.getElementById("bi_id"+i).checked = false;
                document.getElementById("be_id"+i).checked = false;               
            }
            
        }
        else
        {
            document.getElementById("b"+i).innerHTML = "-";
            document.getElementById("bi_id"+i).disabled = true;
            document.getElementById("be_id"+i).disabled = true;
        }
        
        // Move to the next bd...
        uTemp >>= 8;
        
    }
}


var Stg = {

	// Handle the Back key
	handleBackKey: function()
	{
	 	PrintLog(1, "Antenna: Back key pressed");
	 	clearInterval(StgLoopIntervalHandle);
// NO_U        clearTimeout(checkUniiStatusStgTimer);
	 	app.renderHomeView();
	},


    
    
	renderSettingsView: function() 
	{	
	    var u8Buff  = new Uint8Array(10);
	    
// NO_U        var myUniiIcon      = (bUniiStatusKnown && bUniiUp) ? szUniiIconButton + szUniiIconUp + "</button>" : szUniiIconButton + szUniiIconDown + "</button>";
        var myBluetoothIcon = isBluetoothCnx ? szBtIconButton + szBtIconOn + "</button>" : szBtIconButton + szBtIconOff + "</button>";
        var myRegIcon       = (nxtyRxRegLockStatus == 0x00) ? szRegIconButton + "</button>" : isRegistered ? szRegIconButton + szRegIconReg + "</button>" : szRegIconButton + szRegIconNotReg + "</button>";

		        
		var myHtml = 
			"<img src='img/header_settings.png' width='100%' />" +
			"<button id='back_button_id' type='button' class='back_icon' onclick='Stg.handleBackKey()'><img src='img/go_back.png'/></button>"+
			myRegIcon +
            myBluetoothIcon +
// NO_U            myUniiIcon +
            
            
            "<br><br><br><br>" +
            "<div class='settingsSelectContainer'>" +
            
            
            
            "<table id='stgTable' align='center'>" +
            "<tr> <th style='padding: 10px;' colspan='4'>Antenna Selection</th></tr>" +
            "<tr> <th></th>  <th></th> <th>Auto</th> <th>Manual</th> </tr>" +
            "<tr> <td></td>  <td style='padding: 10px;'>Control</td>  <td><input type='radio' id='ba_id' name='AutoMan' class='myRdBtn' onclick='ant(0x0020)'></td> <td><input type='radio' id='bm_id' name='AutoMan' class='myRdBtn' onclick='ant(0x2000)'></td> </tr>" +
             
            "<tr> <th></th>  <th style='padding: 10px;'>bd (MHz)</th> <th>Internal</th> <th>External</th> </tr>" +
            "<tr> <td style='padding: 10px;'>A</td> <td id='b0'>bd: </td>  <td><input type='radio' id='bi_id0' name='bdA' class='myRdBtn' onclick='ant(0x0002)'></td> <td><input type='radio' id='be_id0' name='bdA' class='myRdBtn' onclick='ant(0x0200)'></td> </tr>" +
            "<tr> <td style='padding: 10px;'>B</td> <td id='b1'>bd: </td>  <td><input type='radio' id='bi_id1' name='bdB' class='myRdBtn' onclick='ant(0x0004)'></td> <td><input type='radio' id='be_id1' name='bdB' class='myRdBtn' onclick='ant(0x0400)'></td> </tr>" +
            "<tr> <td style='padding: 10px;'>C</td> <td id='b2'>bd: </td>  <td><input type='radio' id='bi_id2' name='bdC' class='myRdBtn' onclick='ant(0x0008)'></td> <td><input type='radio' id='be_id2' name='bdC' class='myRdBtn' onclick='ant(0x0800)'></td> </tr>" +
            "<tr> <td style='padding: 10px;'>D</td> <td id='b3'>bd: </td>  <td><input type='radio' id='bi_id3' name='bdD' class='myRdBtn' onclick='ant(0x0010)'></td> <td><input type='radio' id='be_id3' name='bdD' class='myRdBtn' onclick='ant(0x1000)'></td> </tr>" +
            "</table> </div>" +            
     
            szMyStatusLine;

		$('body').html(myHtml);  
        
	
	    // Make sure all buttons are disabled until we get up and running...	
        disableAntButtons();
 		
        document.getElementById("bt_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
        document.getElementById("bt_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
        document.getElementById("reg_icon_id").addEventListener('touchstart', HandleButtonUp );     // up, adds transparency
        document.getElementById("reg_icon_id").addEventListener('touchend',   HandleButtonDown );   // down, back to normal, no transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
         		
 		document.getElementById("back_button_id").addEventListener('touchstart', HandleButtonDown );
        document.getElementById("back_button_id").addEventListener('touchend',   HandleButtonUp );
        
        
        // Start the ball rolling...
        StgState              = STG_STATE_READ_GLOBAL_FLAGS_ON_ENTRY;          
        StgTimeoutCount       = 0;
        StgLoopIntervalHandle = setInterval(StgLoop, 1000);
        SpinnerStart("Please wait.", "Getting current antenna status...");
        
        showAlert("Please cycle power on the Network Unit in order for antenna changes to take effect.", "Cycle NU Power.");
          
        currentView = "settings";
	},
};


	
function StgLoop() 
{

    var u8Buff  = new Uint8Array(20);

    PrintLog(1, "Antenna loop...StgState=" + StgState + " StgTimeoutCount= " + StgTimeoutCount );
    StgTimeoutCount++; 
        
    if( StgTimeoutCount > STG_LOOP_COUNT_MAX )
    {
        StgTimeoutCount = 0;
        UpdateStatusLine("Unable to set antenna configuration...");
        showAlert("Unable to set antenna configuration.   Try again.", "Timeout.");
        
        // Reset to last known Ant configuration
        updateAntButtons();
        
        clearInterval(StgLoopIntervalHandle);
        SpinnerStop();
        
        // Do not allow communication to the NU for another 5 seconds....   
        cancelUartRedirect();             
        bOkToRedirectUart = false;
        uartRedirectTimeout = setTimeout(RedirectUartTimeout, 5000); 
        return;       
    }
    
       
    switch( StgState )
    {
        // Start of On Entry states.......................................................
        case STG_STATE_READ_GLOBAL_FLAGS_ON_ENTRY:
        {
            if( (bOkToRedirectUart) || (StgTimeoutCount > 5) )
            {
                // Step 1: Read Global flags to determine the status of Auto/Manual antenna control...  
                u8Buff[0] = 0x01;                               // Redirect to NU...   
                u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
                u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
                u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
                u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
                u8Buff[5] = 0xDE;                               // Set value to 0xDEADBEEF to read register
                u8Buff[6] = 0xAD;
                u8Buff[7] = 0xBE;
                u8Buff[8] = 0xEF;
                nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);

                // Move on...                
                StgState = STG_STATE_READ_ANT_STATUS_ON_ENTRY;
            }
            break;
        }        
            
        case STG_STATE_READ_ANT_STATUS_ON_ENTRY:
        {
            if( window.msgRxLastCmd == NXTY_CONTROL_WRITE_RSP )
            {
                // Step 2: Read Ant status...
                nxtyCurrentReq  = NXTY_SEL_PARAM_ANT_STATUS;
                u8Buff[0]       = 0x02;                       // Code for CU (Already redirected to NU from CONTROL_WRITE above)  
                u8Buff[1]       = NXTY_SEL_PARAM_ANT_STATUS;  // SelParamReg 1: AntennaStatus
                u8Buff[2]       = NXTY_SEL_PARAM_ANT_STATUS;  // SelParamReg 2: AntennaStatus
                nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3);
                
                // Move on...                
                StgState = STG_STATE_WAIT_FOR_ANT_STATUS_ON_ENTRY;
            }
            break;
        }
    
        case STG_STATE_WAIT_FOR_ANT_STATUS_ON_ENTRY:
        {
            // Wait in this state until the Cel-Fi unit responds from getting Ant status...
            if( window.msgRxLastCmd == NXTY_SYS_INFO_RSP )
            {
                
                if( bExtAntAvailable == false )
                {
                    // No Ext Antenna available.   "NWK_FLAG_ENABLE_EXT_ANT" not enabled in Ares code.
                    // Disable all buttons and inform user.
                    PrintLog(1, "AntStatus is 0xFFFFFFFF indicating Ext Ant not allowed.   Disable all selections.");
                    disableAntButtons();
                    clearInterval(StgLoopIntervalHandle);
                    SpinnerStop();
                    
                    showAlert("No External Antenna is available for selection.  Return to main menu.", "No External Antenna.");
                    
                }
                else
                {
                    updateAntButtons();
                
                    clearInterval(StgLoopIntervalHandle);
                    SpinnerStop();
    
                    if( StgTimeoutCount <= STG_LOOP_COUNT_MAX )
                    {
                        UpdateStatusLine("Current antenna status...");
                    }
                
                    // Start looking at the UNII status...
// NO_U                    checkUniiStatusStgTimer = setTimeout(CheckUniiStatusStg, 1000);
                    
                }
                
                // Do not allow communication to the NU for another 5 seconds....                
                bOkToRedirectUart = false;
                uartRedirectTimeout = setTimeout(RedirectUartTimeout, 5000);
            }
            break; 
        }
        // End of On Entry states.......................................................    
    
    
    
        case STG_STATE_SET_ANT:
        {
            // Must wait here until 5 seconds after the last NU access
            // for the UART redirect to time out.
            if( bOkToRedirectUart )
            {
                // Send the actual antenna selection message...
                u8Buff[0] = 0x01;                               // Redirect to NU on entry...   
                u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
                u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
                u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
                u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
                u8Buff[5] = (antCode >> 24);                    // Note that javascript converts var to INT32 for shift operations.
                u8Buff[6] = (antCode >> 16);
                u8Buff[7] = (antCode >> 8);
                u8Buff[8] = (antCode >> 0);
            
                nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);
                UpdateStatusLine("Verifying antenna flash write...");
                StgState = STG_STATE_READ_GLOBAL_FLAGS;
            }
            break;
        }
    
        case STG_STATE_READ_GLOBAL_FLAGS:
        {
            if( window.msgRxLastCmd == NXTY_CONTROL_WRITE_RSP )
            {
                // Step 2: Read global flags and make sure not busy, i.e. data has been written if requested...
                if( (nxtyCtrlWriteRsp & 0xFFFFFF00) == 0 )
                {
                    // Data has been written successfully. 
                    UpdateStatusLine("Reading antenna configuration...");
                    StgState = STG_STATE_WAIT_FOR_ANT_STATUS;
                    
                    nxtyCurrentReq  = NXTY_SEL_PARAM_ANT_STATUS;
                    u8Buff[0] = 0x02;                       // Should already be redirected...code for CU   
                    u8Buff[1] = NXTY_SEL_PARAM_ANT_STATUS;  // SelParamReg 1: AntennaStatus
                    u8Buff[2] = NXTY_SEL_PARAM_ANT_STATUS;  // SelParamReg 2: NA
                
                    nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3);   
                                    
                    // Do not allow communication to the NU for another 5 seconds....                
                    bOkToRedirectUart = false;
                    uartRedirectTimeout = setTimeout(RedirectUartTimeout, 6000);                 
                }
                else
                {
                    // Read again until (nxtyCtrlWriteRsp & 0xFFFFFF00) == 0
                    u8Buff[0] = 0x00;                               // Should already be redirected...   
                    u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
                    u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
                    u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
                    u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
                    u8Buff[5] = 0xDE;                               // Set value to 0xDEADBEEF to read register
                    u8Buff[6] = 0xAD;
                    u8Buff[7] = 0xBE;
                    u8Buff[8] = 0xEF;
                
                    nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);
                }
            }
            break;
        }
    

    
    
        case STG_STATE_WAIT_FOR_ANT_STATUS:
        {
            var uTemp;
            
            // Step 3: Wait in this state until the Cel-Fi unit responds from getting Ant status...
            if( (bOkToRedirectUart) && (window.msgRxLastCmd == NXTY_SYS_INFO_RSP) )
            {
                // Get the status of the GlobalFlags to make sure that AutoMan is updated....
                u8Buff[0] = 0x81;                               // Open and shut...   
                u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
                u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
                u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
                u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
                u8Buff[5] = 0xDE;                               // Set value to 0xDEADBEEF to read register
                u8Buff[6] = 0xAD;
                u8Buff[7] = 0xBE;
                u8Buff[8] = 0xEF;
                nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);                
                
            }
            else if( window.msgRxLastCmd == NXTY_CONTROL_WRITE_RSP )
            {
                updateAntButtons();
                
                clearInterval(StgLoopIntervalHandle);
                SpinnerStop();
    
                if( StgTimeoutCount <= STG_LOOP_COUNT_MAX )
                {
                    UpdateStatusLine("Current antenna status...");
                    
                    if( bAntChangeInProgress )
                    {
//                        showAlert("Please cycle power on Network Unit in order for this Antenna change to take place.", "Cycle Power.");
                    }
                    
                    bAntChangeInProgress = false;
                }
                
                
                // Start looking at the UNII status...
// NO_U                checkUniiStatusStgTimer = setTimeout(CheckUniiStatusStg, 1000);
                
                // Do not allow communication to the NU for another 5 seconds....                
                bOkToRedirectUart = false;
                uartRedirectTimeout = setTimeout(RedirectUartTimeout, 5000);
            }
            break; 
        }

        default:
        {
            clearInterval(StgLoopIntervalHandle);
            UpdateStatusLine("Invalid State.");
            break;
        }
        
    }   // end switch
}
