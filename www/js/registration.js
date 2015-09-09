
var RegLoopIntervalHandle   = null;
var	regState			    = REG_STATE_DONE;

const REG_STATE_INIT                        = 1;
const REG_STATE_CHECK_CELL_SEARCH_COMPLETE  = 2;
const REG_STATE_CELL_INFO_REQ               = 3;
const REG_STATE_CELL_INFO_RSP               = 4;
const REG_STATE_OPER_REG_RSP                = 5;
const REG_STATE_REGISTRATION_RSP            = 6;
const REG_STATE_DONE                        = 7;


const regStateNames                 = ["N/A", "Init", "Cell Search Complete", "Cell Info Req", "Cell Info Rsp", "Oper Reg Rsp - Wait on Cloud", "Reg Rsp - Wait on Cel-Fi"];



const REG_NAK_COUNT_MAX             = 2;
const REG_LOOP_COUNT_MAX            = 20;


// Values for RegSupportData
const REG_SUPPORT_DATA_TYPE_MASK        = 0xF000;
const REG_SUPPORT_DATA_TYPE_CELL_SEARCH = 0x4000;

// Percentage per stage provided by JC.
const stagePercentArray = [0, 50/1800, 100/1800, 150/1800, 300/1800, 300/1800, 100/1800, 0, 800/1800];



// Reg data items shared with cloud..
var myPlmnid                    = "no plmind";
var myRegDataToOp               = "registration data to operator";
var myRegDataFromOp             = null;
var myRegOpForce                = null;

var regTimeoutCount             = 0;
var RegNakCount                 = 0;
var bProgBarDisplayed           = false;


// User input....
var szRegFirstName              = "";
var szRegLastName               = "";
var szRegAddr1                  = "";
var szRegAddr2                  = "";
var szRegCity                   = "";
var szRegState                  = "";
var szRegZip                    = "";
var szRegCountry                = "";
var szRegPhone                  = "";
var szUserValidation            = "Mandatory Input: Please enter";




// Geolocation Callbacks
// HandleConfirmLocation.......................................................................................
// process the confirmation dialog result
function HandleConfirmLocation(buttonIndex) 
{
    // buttonIndex = 0 if dialog dismissed, i.e. back button pressed (do nothing).
    // buttonIndex = 1 if 'Yes' to use location information.
    // buttonIndex = 2 if 'No'
    if( buttonIndex == 1 )
    {
        // Request location...
        SpinnerStart( "Please wait", "Acquiring location information..." );
        
//        var options = {maximumAge: 0, timeout: 10000, enableHighAccuracy:true};
//        var options = { timeout: 31000, enableHighAccuracy: true, maximumAge: 90000 };
//        navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
        navigator.geolocation.getCurrentPosition(geoSuccess, geoError, {timeout:10000});

    }
    
    // No:  Do not use location information so return to main menu immediately...
    if( buttonIndex == 2 )
    {
        reg.handleBackKey();
    }        
}



// This method accepts a Position object, which contains the
// current GPS coordinates
//
function geoSuccess(position) 
{
    SpinnerStop();
    SendCloudLocation( position.coords.latitude, position.coords.longitude );
//    showAlert( "Lat:Long " + position.coords.latitude + ":" + position.coords.longitude, "Location Determined." );
    
    navigator.notification.confirm(
        "Lat:Long " + position.coords.latitude + ":" + position.coords.longitude,    // message
        HandleLocationBack,             // callback to invoke with index of button pressed
        'Location Acquired',            // title
        ['ok'] );                       // buttonLabels
    
    
    
/*    
    alert('Latitude: '          + position.coords.latitude          + '\n' +
          'Longitude: '         + position.coords.longitude         + '\n' +
          'Altitude: '          + position.coords.altitude          + '\n' +
          'Accuracy: '          + position.coords.accuracy          + '\n' +
          'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
          'Heading: '           + position.coords.heading           + '\n' +
          'Speed: '             + position.coords.speed             + '\n' +
          'Timestamp: '         + position.timestamp                + '\n');
*/          
}


// geoError Callback receives a PositionError object
//
function geoError(error) 
{
    SpinnerStop();
//    showAlert( "No location information will be stored.", "Unable to acquire GPS." );

    navigator.notification.confirm(
        "No location information will be stored.",    // message
        HandleLocationBack,             // callback to invoke with index of button pressed
        'Unable to acquire GPS.',            // title
        ['ok'] );                       // buttonLabels
    
//    showAlert( "Uncode: " + error.code + " msg: " + error.message, "Unable to acquire GPS." );
          
}


function HandleLocationBack(buttonIndex) 
{
    // Just go back...
    reg.handleBackKey();
}



var reg = {

	// Handle the Back key
	handleBackKey: function()
	{
	 	PrintLog(1, "Reg: Reg Mode Back key pressed");
             
        if( isRegistered == false )
        {
            // Save any typed data in case user comes back...
            szRegFirstName  = document.inputUser.fName.value;
            szRegLastName   = document.inputUser.lName.value;
            szRegAddr1      = document.inputUser.addr1.value;
            szRegAddr2      = document.inputUser.addr2.value;
            szRegCity       = document.inputUser.city.value;
            szRegState      = document.inputUser.state.value;
            szRegZip        = document.inputUser.zip.value;
            szRegCountry    = document.inputUser.country.value;
            szRegPhone      = document.inputUser.phone.value;
        }

        clearInterval(RegLoopIntervalHandle);
        regState = REG_STATE_DONE;      
        app.renderHomeView();
	},


    validateUser: function()
    {
        PrintLog(1, "Reg: Reg key pressed");

                                
        if( document.inputUser.fName.value == "" )
        {
            showAlert( "First Name", szUserValidation );
        }
        else if( document.inputUser.lName.value == "" )
        {
            showAlert( "Last Name", szUserValidation );
        }
        else if( document.inputUser.addr1.value == "" )
        {
            showAlert( "Address Line 1", szUserValidation );
        }
        else if( document.inputUser.city.value == "" )
        {
            showAlert( "City", szUserValidation );
        }
        else if( document.inputUser.state.value == "" )
        {
            showAlert( "State/Province/Region", szUserValidation );
        }
        else if( document.inputUser.zip.value == "" )
        {
            showAlert( "ZIP/Postal Code", szUserValidation );
        }
        else if( document.inputUser.country.value == "" )
        {
            showAlert( "Country", szUserValidation );
        }
        else if( document.inputUser.phone.value == "" )
        {
            showAlert( "Phone", szUserValidation );
        }
        else
        {  
            // Save the good data...
            szRegFirstName  = document.inputUser.fName.value;
            szRegLastName   = document.inputUser.lName.value;
            szRegAddr1      = document.inputUser.addr1.value;
            szRegAddr2      = document.inputUser.addr2.value;
            szRegCity       = document.inputUser.city.value;
            szRegState      = document.inputUser.state.value;
            szRegZip        = document.inputUser.zip.value;
            szRegCountry    = document.inputUser.country.value;
            szRegPhone      = document.inputUser.phone.value;
        
            // Send the mandatory user information to the cloud...
            SendCloudData( "'firstName':'"    + szRegFirstName + 
                           "', 'lastName':'"  + szRegLastName  +
                           "', 'addr_1':'"    + szRegAddr1     +
                           "', 'city':'"      + szRegCity      +
                           "', 'state':'"     + szRegState     +
                           "', 'zip':'"       + szRegZip       +
                           "', 'country':'"   + szRegCountry   +
                           "', 'phone':'"     + szRegPhone     + "'" );
            
            // Send optional data if available...                
            if( document.inputUser.addr2.value != "" )
            {
                 SendCloudData( "'addr_2':'" + szRegAddr2 + "'" );
            }
        
            // Start the registration...
            if( isRegistered == false )
            {
                if( regState == REG_STATE_DONE )
                {
                    regState = REG_STATE_INIT;
                    reg.RegLoop();
                }
            }
            else
            {
                showAlert("No need to re-register.", "Already Registered.");
            }
        
        }
       
        
        return false;
    },
    
	renderRegView: function() 
	{	
// NO_U        var myUniiIcon      = (bUniiStatusKnown && bUniiUp) ? szUniiIconButton + szUniiIconUp + "</button>" : szUniiIconButton + szUniiIconDown + "</button>";
        var myBluetoothIcon = isBluetoothCnx ? szBtIconButton + szBtIconOn + "</button>" : szBtIconButton + szBtIconOff + "</button>";
        var myRegIcon       = (nxtyRxRegLockStatus == 0x00) ? szRegIconButton + "</button>" : isRegistered ? szRegIconButton + szRegIconReg + "</button>" : szRegIconButton + szRegIconNotReg + "</button>";
		        
		var myHtml = 
			"<img src='img/header_reg.png' style='position: fixed; top: 0px; width: 100%;'  />" +
			"<button id='back_button_id' type='button' class='back_icon' onclick='reg.handleBackKey()'><img src='img/go_back.png'/></button>"+
			myRegIcon +
            myBluetoothIcon +
// NO_U            myUniiIcon +
            
//            "<br><br>" +
            "<div style='height:120%; margin-top:17%; width:100%'>" +         // Vertical scroll div...
                "<div class='userInputContainer'>" +
                "<form name='inputUser' >" +
                "<fieldset>" +
                "<label>*First Name: </label><input type='text' name='fName' value=''>" +
                "<label>*Last Name: </label><input type='text' name='lName' value=''>" +
                "<label>*Address line 1: </label><input type='text' name='addr1' value=''>" +
                "<label>Address line 2: </label><input type='text' name='addr2' value=''>" +
                "<label>*City: </label><input type='text' name='city' value=''>" +
                "<label>*State/Prov/Reg: </label><input type='text' name='state' value=''>" +
                "<label>*ZIP/Postal Code: </label><input type='text' name='zip' value=''>" +
                "<label>*Country: </label><input type='text' name='country' value=''>" +
                "<label>*Phone: </label><input type='text' name='phone' value=''>" +
    
                "<label>(* mandatory)  </label><input style='position: relative; bottom: 0px;  width: 35%; font-size: 20px;' type='button' value='Register' onclick='JavaScript:return reg.validateUser();'></fieldset></form></div>" +
                "<br><p id='p_id'></p>" +
            "</div>" +
                   

            szMyStatusLine;

		$('body').html(myHtml);  
        
        // Fill in from cloud...
        document.inputUser.fName.value   = szRegFirstName;
        document.inputUser.lName.value   = szRegLastName;
        document.inputUser.addr1.value   = szRegAddr1;
        document.inputUser.addr2.value   = szRegAddr2;
        document.inputUser.city.value    = szRegCity;
        document.inputUser.state.value   = szRegState;
        document.inputUser.zip.value     = szRegZip;
        document.inputUser.country.value = szRegCountry;
        document.inputUser.phone.value   = szRegPhone;        
                
		UpdateStatusLine("Select 'Register' button to continue");
		
        document.getElementById("bt_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
        document.getElementById("bt_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
        document.getElementById("reg_icon_id").addEventListener('touchstart', HandleButtonUp );     // up, adds transparency
        document.getElementById("reg_icon_id").addEventListener('touchend',   HandleButtonDown );   // down, back to normal, no transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
         		
 		document.getElementById("back_button_id").addEventListener('touchstart', HandleButtonDown );
        document.getElementById("back_button_id").addEventListener('touchend',   HandleButtonUp );
        
        if( bGotUserInfoRspFromCloud == false )
        {
            showAlert( "Unable to retrieve User Info from cloud...", "Cloud.");    
        }         

        bProgBarDisplayed = false;
        currentView       = "registration";
        regState          = REG_STATE_DONE;
        
        
	},


	RegLoop: function() 
	{

	    var u8Buff  = new Uint8Array(20);
	    
        regTimeoutCount += 1;
		PrintLog(4, "Reg: Reg loop... state = " + regStateNames[regState] );
		
		switch( regState )
		{
		
			case REG_STATE_INIT:
			{
			    UpdateStatusLine("Verifying System Information...");
			    SpinnerStart("Validation..", "Verifying System Information...");
				regState              = REG_STATE_CHECK_CELL_SEARCH_COMPLETE;
	 			RegLoopIntervalHandle = setInterval(reg.RegLoop, 2000 );
                regTimeoutCount       = 0;
                RegNakCount           = 0;
	 			
	 			// Make sure that the action is false so the watching event will see a false to true transition.
	 			SendCloudData(  "'regAction':'false'" );

                // Get the Reg Data from the CU...	 			
		        nxtyCurrentReq  = NXTY_SEL_PARAM_REG_SUPPORT_DATA;
                u8Buff[0] = 0x02;                               // Get info from CU   
                u8Buff[1] = NXTY_SEL_PARAM_REG_SUPPORT_DATA;    // SelParamReg 17: RegSupportData
                u8Buff[2] = NXTY_SEL_PARAM_REG_SUPPORT_DATA;    // same so PIC can optimize
                nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3);
                        
	 			break; 
			}


            case REG_STATE_CHECK_CELL_SEARCH_COMPLETE:
            {
                // Wait in this state until the Cel-Fi unit is in PLACE state or greater, i.e. Cell Search Complete...
                if( window.msgRxLastCmd == NXTY_SYS_INFO_RSP )
                {
                    if( (nxtySelParamRegOneRsp & REG_SUPPORT_DATA_TYPE_MASK) == REG_SUPPORT_DATA_TYPE_CELL_SEARCH )
                    {
                        PrintLog(1, "RegSupportData: 0x" + nxtySelParamRegOneRsp.toString(16) );
                                            
                        // Unit is still in cell search...
                        if( bProgBarDisplayed == false )
                        {
                            SpinnerStop();
                            UpdateStatusLine("Please wait for cell search to complete...");
                            showAlert("Cell search must complete before registration can proceed.", "Please wait..." );
                        
                            // Display the progress bar.
                            document.getElementById("p_id").innerHTML = "<div class='html5-progress-bar'>" +
                                                                            "<div class='progress-bar-wrapper'>"        +
                                                                            "Network Search Progress...<br><progress id='pbar_id' value='0' max='100'></progress>" +
                                                                                "<span id='pbarper_id' class='progress-value'>0%</span>" +
                                                                            "</div></div>";      
                            bProgBarDisplayed = true;
                        }
                        
                        // Update the progress bar with the current status...
                        var i;
                        var currentStage    = ((nxtySelParamRegOneRsp & 0x00F0) >> 4);
                        const maxStage      = 8;
                        var percentComplete = 0;
                        
                        // Limit to the max number of stages to 8
                        if( currentStage > maxStage )
                        {
                            currentStage = maxStage;
                        }
                        
                        // Add the percent per stage up to the current stage.
                        for( i = 0; i <= maxStage; i++ )
                        {
                            if( i < currentStage )
                            {
                                percentComplete += stagePercentArray[i];
                            }
                        }

                        // Convert from decimal to percent...
                        percentComplete *= 100;
                        
                        
                        // Add the current stage percentage...
                        percentComplete += ((nxtySelParamRegOneRsp & 0x000F) * 10) * stagePercentArray[currentStage];
                        
                        // Round to the nearest integer...
                        percentComplete = Math.round(percentComplete);
                        
                        if( percentComplete > 100 )
                        {
                            percentComplete = 100;
                        }
                        
                        // Update the progress bar...
                        document.getElementById('pbar_id').value = percentComplete;
                        $('.progress-value').html(percentComplete + '%');
                        
                        
                        // Request updated status...
                        nxtyCurrentReq  = NXTY_SEL_PARAM_REG_SUPPORT_DATA;
                        u8Buff[0] = 0x02;                               // Get info from CU   
                        u8Buff[1] = NXTY_SEL_PARAM_REG_SUPPORT_DATA;    // SelParamReg 17: RegSupportData
                        u8Buff[2] = NXTY_SEL_PARAM_REG_SUPPORT_DATA;    // SelParamReg 17 again so that PIC will ignore.
                        nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3);
                        
                        // Do not time out of this state as Cell Search can take up to 1 hour...
                        regTimeoutCount = 0;
                    }
                    else
                    {
                        // Unit is no longer in Cell Search so remove progress bar and go to the next step.
                        document.getElementById("p_id").innerHTML = ""; 
                        regState        = REG_STATE_CELL_INFO_REQ;
                        regTimeoutCount = 0;
                    }
                

                }
                else if( msgRxLastCmd == NXTY_NAK_RSP )
                {   
                    // Try again if CRC NAK...
                    if( (nxtyLastNakType == NXTY_NAK_TYPE_CRC) || (nxtyLastNakType == NXTY_NAK_TYPE_TIMEOUT) )
                    {
                        if( RegNakCount++ >= REG_NAK_COUNT_MAX )
                        {
                            clearInterval(RegLoopIntervalHandle);
                            regState = REG_STATE_DONE;
                            SpinnerStop();
                            UpdateStatusLine("Failed to receive response from Cel-Fi device.");
                            showAlert("Failed to receive response from Cel-Fi device.", (nxtyLastNakType == NXTY_NAK_TYPE_CRC)?"CRC Error Max.":"Timeout" );
                        }
                    }
                }

                
                // Safety exit...
                if( regTimeoutCount >= REG_LOOP_COUNT_MAX )
                {
                    // after so many times exit stage left...
                    clearInterval(RegLoopIntervalHandle);
                    regState = REG_STATE_DONE;
                        
                    SpinnerStop();
                    UpdateStatusLine("Timeout: Failed to receive response from Cel-Fi device.");
                    showAlert("No response from Cel-Fi device.", "Timeout.");
                }

                break;
            }



			case REG_STATE_CELL_INFO_REQ:
			{
                // Send a message to the Cel-Fi unit to gather Cell Info...			
				nxty.SendNxtyMsg(NXTY_CELL_INFO_REQ, null, 0);
				UpdateStatusLine("Requesting Cell Info from Cel-Fi device.");
                SpinnerStart("Registering...", "Requesting Cell Info...");
				regState    = REG_STATE_CELL_INFO_RSP;
				RegNakCount = 0;
				break;
			}
			
			case REG_STATE_CELL_INFO_RSP:
			{
                // Wait in this state until the Cel-Fi unit responds...
				if( window.msgRxLastCmd == NXTY_CELL_INFO_RSP )
				{
				    if( myRegDataToOp == "Cell data not available" )
				    {
				        // Cell data not available...
                        clearInterval(RegLoopIntervalHandle);
                        regState = REG_STATE_DONE;
                        SpinnerStop();
                        
                        UpdateStatusLine("Registration unavailable.  Please try again later.");
                        showAlert("Searching for cell information.  Please try again later.", "Registration unavailable.");				        
				    }
				    else
				    {
                        // We have received the response from the Cel-Fi unit..
                        // Send the data from the Cel-Fi unit to the cloud...
                        var myText = "'plmnid':'"        + myPlmnid      + "', " +
                                     "'regDataToOp':'"   + myRegDataToOp + "', " +
                                     "'regDataFromOp':'0', "                   +        // Fill return with 0
                                     "'regAction':'true'";                              // Fire the event.
                        
                        SendCloudData( myText );
                            
                        UpdateStatusLine("Waiting for Operator response ... ");
                        SpinnerStart("Registering...", "Requesting Operator Info...");
                        regState        = REG_STATE_OPER_REG_RSP;
                        regTimeoutCount = 0;
                        RegNakCount     = 0;
                        myRegOpForce    = null;                    
                        myRegDataFromOp = null;
                    }
				}
                else if( msgRxLastCmd == NXTY_NAK_RSP )
                {   
                    // Try again if CRC NAK...
                    if( nxtyLastNakType == NXTY_NAK_TYPE_CRC )
                    {
                        regState = REG_STATE_CELL_INFO_REQ;
                        
                        if( RegNakCount++ >= REG_NAK_COUNT_MAX )
                        {
                            clearInterval(RegLoopIntervalHandle);
                            regState = REG_STATE_DONE;
                            
                            SpinnerStop();
                            UpdateStatusLine("Failed to receive Authentication response from Cel-Fi device due to CRC error.");
                            showAlert("Failed to receive Authentication response from Cel-Fi device.", "CRC Error Max.");
                        }
                    }
                    else if( nxtyLastNakType == NXTY_NAK_TYPE_UNIT_REDIRECT )
                    {
                        // Try to clear if UART redirect...
                        regState = REG_STATE_CELL_INFO_REQ;
                        cancelUartRedirect();
                                                
                        if( RegNakCount++ >= REG_NAK_COUNT_MAX )
                        {
                            clearInterval(RegLoopIntervalHandle);
                            regState = REG_STATE_DONE;
                            
                            SpinnerStop();
                            UpdateStatusLine("Failed to receive Authentication response from Cel-Fi device due to CRC error.");
                            showAlert("Failed to receive Authentication response from Cel-Fi device.", "CRC Error Max.");
                        }
                    }                    
                }

			    
			    // Safety exit...
			    if( regTimeoutCount >= REG_LOOP_COUNT_MAX )
			    {
                    // after so many times exit stage left...
                    clearInterval(RegLoopIntervalHandle);
                    regState = REG_STATE_DONE;
                    
                    SpinnerStop();
                    UpdateStatusLine("Failed to receive Cell Info from Cel-Fi device.");
                    showAlert("No Cell Info response from Cel-Fi device.", "Timeout.");
			    }
				break;
			}
			
			
			
			case REG_STATE_OPER_REG_RSP:     // Wait on egress from platform "regOpForce:true'
			{
				// Poll the cloud...
				SendCloudPoll();
				
			
				if( myRegOpForce != null )
				{
                    // Grab the data from the cloud, i.e. operator...
                    PrintLog(1, "Egress: regOpForce = " + myRegOpForce );
                    
                    if( myRegOpForce == 'true' )
                    {   
                        var temp  = "regOpForce:true";
                        var u8rsp = bluetoothle.stringToBytes(temp);
                    }
                    else
                    {
                        var temp  = "regOpForce:false";
                        var u8rsp = bluetoothle.stringToBytes(temp);      
//                        var u8rsp = bluetoothle.stringToBytes(myRegDataFromOp);
                    } 

                    
				    // Send a registration request to the Cel-Fi... 
                    nxty.SendNxtyMsg(NXTY_REGISTRATION_REQ, u8rsp, u8rsp.length);
                    

                    UpdateStatusLine("Authenticating ... ");
                    SpinnerStart("Registering...", "Authenticating...");
                    regState        = REG_STATE_REGISTRATION_RSP;
                    regTimeoutCount = 0;
				}
				else
				{

                    UpdateStatusLine("Waiting for Operator response ... " + regTimeoutCount );

                    // Safety exit...
                    if( regTimeoutCount >= REG_LOOP_COUNT_MAX )
                    {
                        // after so many times exit stage left...
                        clearInterval(RegLoopIntervalHandle);
                        regState = REG_STATE_DONE;
                        
                        SpinnerStop();
                        UpdateStatusLine("Failed to receive response from Operator.");
                        showAlert("No response from Operator.", "Timeout.");
                    }
				}

				break;
			}

			
			case REG_STATE_REGISTRATION_RSP:
			{
			    // Wait on response from Cel-Fi.
				if( msgRxLastCmd == NXTY_REGISTRATION_RSP )
				{
					// We have received the response from the Cel-Fi unit..
					
					// Stop the rotating wheel...
                	SpinnerStop();
					
					if( isRegistered )
					{
						UpdateStatusLine("Registration successful...");
						var d = new Date();
						SendCloudData( "'RegDate':'" + d.toLocaleDateString() + "'" );
						SendCloudData( "'Registered':" + 1 );
						
                        navigator.notification.confirm(
                            'Registration successful.  Provide location information?',    // message
                            HandleConfirmLocation,              // callback to invoke with index of button pressed
                            'Location',                         // title
                            ['Yes', 'No'] );                    // buttonLabels
						
					}
					else
					{
						UpdateStatusLine("Registration not successful...");
						SendCloudData( "'Registered':" + 0 );
						
					}
                    clearInterval(RegLoopIntervalHandle);
                    regState = REG_STATE_DONE;
					
				}
				else if( msgRxLastCmd == NXTY_NAK_RSP )
                {   
                    // Try again if CRC NAK...
                    if( nxtyLastNakType == NXTY_NAK_TYPE_CRC )
                    {
                        regState = REG_STATE_OPER_REG_RSP;
                        
                        if( RegNakCount++ >= REG_NAK_COUNT_MAX )
                        {
                            clearInterval(RegLoopIntervalHandle);
                            regState = REG_STATE_DONE;
                            
                            UpdateStatusLine("Failed to receive Authentication response from Cel-Fi device due to CRC error.");
                            showAlert("Failed to receive Authentication response from Cel-Fi device.", "CRC Error Max.");
                        }
                    }
                }
                else
                {
                    UpdateStatusLine("Authenticating ... " + regTimeoutCount);
                }
                
                           
                // Safety exit...
                if( regTimeoutCount >= REG_LOOP_COUNT_MAX )
                {
                    // after so many times exit stage left...
                    clearInterval(RegLoopIntervalHandle);
                    regState = REG_STATE_DONE;
                    
                    SpinnerStop();
                    UpdateStatusLine("Failed to receive Authentication response from Cel-Fi device.");
                    showAlert("No Authentication response from Cel-Fi device.", "Timeout.");
                }
				break;
			}
			
			
			
            case REG_STATE_DONE:
   			default:
			{
//  		    	clearInterval(RegLoopIntervalHandle);
				break;
			}
		}
		
		

		
	},
};






	
