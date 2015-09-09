
// Use window.isPhone to show global var or just use without "window." ...
var isPhone      = false;
var isRegistered = true;

const   MAIN_LOOP_COUNTER_MAX   = 30;
const   SwPnNuCu                = "700.036.";
const   SwPnPic                 = "700.040.";
const   SwPnBt                  = "700.041.";


var szBtIconOn              = "<img src='img/bluetooth_on.png' />";
var szBtIconOff             = "<img src='img/bluetooth_off.png' />";
var szRegIconReg            = "<img src='img/reg_yes.png' />";
var szRegIconNotReg         = "<img src='img/reg_no.png' />";                       // With bar
var szUniiIconUp            = "<img src='img/unii_yes.png' />";
var szUniiIconDown          = "<img src='img/unii_no.png' />";
var szMyStatusLine          = "<p id='status_line_id' class='status_line'></p>";
var szBtIconButton          = "<button type='button' id='bt_icon_id'   class='bt_icon'   onclick=handleBtInfo()>";
var szRegIconButton         = "<button type='button' id='reg_icon_id'  class='reg_icon'  onclick=handleRegInfo()>";
// NO_U var szUniiIconButton        = "<button type='button' id='unii_icon_id' class='unii_icon' onclick=handleUniiInfo()>";

var myModel                 = "MN8";
var mySn                    = "12345678";
var mySandboxPlatformUrl    = "https://nextivity-sandbox-connect.axeda.com:443/ammp/";
var myPlatformUrl           = "https://nextivity-connect.axeda.com:443/ammp/";
var myOperatorCode          = "0000";
var myLat                   = 32.987838;             // Nextivity lat
var myLong                  = -117.074195;           // Nextivity long
var currentView             = "main";
var bDisplayBackgroundRing  = false;
var bSentCloud              = false;
var bUniiUp                 = true;
var bUniiStatusKnown        = false;
var bNaking                 = false;
var uMainLoopCounter        = 0;
var MainLoopIntervalHandle  = null; 
var isNetworkConnected      = null;
var bGotUserInfoRspFromCloud    = false;
var bPrivacyViewed          = false;
var bCheckBluetoothOnStartup    = true;
var bSpinner                = false;
var bExtAntCheckComplete    = false;            // Set to true when we get response from NU.
var iExtAntCheckSubState    = 0;
var bExtAntAvailable        = false;            // Set to true if ant check returns non 0xFFFFFFFF.
var checkUniiStatusMainTimer = null;



var uIcd                    = 0;
var swVerBtScan             = "--.--";          // Filled in by scan results. 
var szVerApp                = "01.00.03";       // In BCD, remember config.xml as well.
const CFG_RUN_ON_SANDBOX    = false;            // true to run on Axeda sandbox.  false to run on Axeda production platform.

// Determine which messages get sent to the console.  1 normal, 10 verbose.
// Level  1: Flow and errors.
// Level  2: Raw bluetooth Tx data
// Level  3: Raw bluetooth Rx Data partial msgs
// Level  4: Timing loops
// Level 10: Bluetooth processing.
// Level 99: Error, print in red.
var PrintLogLevel = 1;













// PrintLog............................................................................................
function PrintLog(level, txt)
{
    var d       = new Date();
    var myMs    = d.getMilliseconds();
    
    
    if( myMs < 10 )
    {
        myMs = "00" + myMs;
    }
    else if( myMs < 100 )
    {
        myMs = "0" + myMs;
    }
    
    
    if( level == 99 )
    {
//        console.log("**** Error: (" + d.getSeconds() + "." + d.getMilliseconds() + ") " + txt);
        var logText = "(" + d.getMinutes() + ":" + d.getSeconds() + "." + myMs + ") **** Error: " + txt;
        console.log( logText );
        WriteLogFile( logText );
        
//jdo        console.error(txt);            // console.error does not work on phonegap
    }
    else if( level <= PrintLogLevel )
    { 
        var logText = "(" + d.getMinutes() + ":" + d.getSeconds() + "." + myMs + ") " + txt;
        console.log( logText );
        WriteLogFile( logText );
    }
    
}

// UpdateStatusLine....................................................................................
function UpdateStatusLine(statusText)
{
	document.getElementById("status_line_id").innerHTML = statusText;
	
	// Save to log file...
	PrintLog(1, "StatusLine: " + statusText );
}

// SpinnerStart........................................................................................
// Had to add a plugin for Spinners since IOS does not support navigator.notification.activityStart()
function SpinnerStart(title, msg )
{
    SpinnerStop();
    
    // Note: spinner dialog is cancelable by default on Android and iOS. On WP8, it's fixed by default
    // so make fixed on all platforms.
    // Title is only allowed on Android so never show the title.
    window.plugins.spinnerDialog.show(null, msg, true);
    bSpinner = true;
    
    // Save to log file...
    PrintLog(1, "Spinner: " + msg );
    
}

// SpinnerStop........................................................................................
function SpinnerStop()
{
    if( bSpinner )
    {
        window.plugins.spinnerDialog.hide();
        bSpinner = false;
    }
}

// HandleButtonDown............................................................................................
function HandleButtonDown()
{
	// No transparency when pressed...
	$(this).css("opacity","1.0");
    $(this).css("outline", "none" );       // Used to remove orange box for android 4+
}

// HandleButtonUp............................................................................................
function HandleButtonUp()
{
	$(this).css("opacity","0.5");
	$(this).css("outline", "none" );       // Used to remove orange box for android 4+
}


// handleBtInfo............................................................................................
function handleBtInfo()
{
    var jText = "Indicates if connected to Cel-Fi device via Bluetooth.\nBlue means connected.\nGray means not connected.\nCurrent status: ";
    
    if( isBluetoothCnx )
    {
        jText += "CONNECTED";
    }
    else
    {
        jText += "NOT CONNECTED";
    }
     
    showAlert( jText, "Bluetooth ICON" );
}


// handleRegInfo............................................................................................
function handleRegInfo()
{
    var jText = "Indicates if registered or not.\nCurrent status: ";
    
    if( isRegistered )
    {
        jText += "REGISTERED";
    }
    else
    {
        jText += "NOT REGISTERED";
    }
     
    showAlert( jText, "Registered ICON" );
}


/* 
NO_U

// handleUniiInfo............................................................................................
function handleUniiInfo()
{
    var jText = "Indicates if wireless link between units is up or down.\nCurrent status: ";
    
    if( bUniiUp )
    {
        jText += "UP.";
    }
    else
    {
        jText += "DOWN.";
    }
     
    showAlert( jText, "Wireless Link ICON" );
}

// UpdateUniiIcon....................................................................................
function UpdateUniiIcon(bStatus)
{
    bUniiUp          = bStatus;
    bUniiStatusKnown = true;
    
    // Set to UNII Up...
    if( bUniiUp )
    {
        document.getElementById("unii_icon_id").innerHTML = szUniiIconUp;     // unii_yes.png
    }
    else
    {
        document.getElementById("unii_icon_id").innerHTML = szUniiIconDown;     // unii_no.png
    }
}


// CheckUniiStatusMain....................................................................................
function CheckUniiStatusMain()
{
    var u8Buff  = new Uint8Array(20);
 
    if( currentView == "main" )
    {
        // Check to see if UNII is up...
        nxtyCurrentReq  = NXTY_SEL_PARAM_LINK_STATE;
        u8Buff[0] = 0x02;                       // Check CU   
        u8Buff[1] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 1: LinkState
        u8Buff[2] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 2: LinkState
        nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3); 
    
        // Return here in 1 second....
        checkUniiStatusMainTimer = setTimeout(CheckUniiStatusMain, 1000);
    }
}
*/



// U8ToHexText............................................................................................
function U8ToHexText(u8)
{
    if( u8 < 0x10 )
    {
        return( "0" + u8.toString(16).toUpperCase() );     // Add a leading 0....
    }
    else
    {
        return( u8.toString(16).toUpperCase() );     
    }
}

// DecTo3Text............................................................................................
function DecTo3Text(u8)
{
    if( u8 < 10 )
    {
        return( "00" + u8.toString(10) );     // Add a leading 00....
    }
    else if( u8 < 100 )
    {
        return( "0" + u8.toString(10) );     // Add a leading 0....
    }

    else
    {
        return( u8.toString(10) );     
    }
}

// HexTo3Text.....................................................................................................
function HexTo3Text(myNum) 
{
    if(myNum < 0x010) 
    {
        return( "00" + myNum.toString(16).toUpperCase() );
    } 
    else if(myNum < 0x100) 
    {
        return( "0" + myNum.toString(16).toUpperCase() );
    } 
    else 
    {
        return( myNum.toString(16).toUpperCase() );
    }
}

// UpdateRegIcon....................................................................................
function UpdateRegIcon(reg)
{
    // Enable the ICON button to allow info if user touches.                
    document.getElementById("reg_icon_id").disabled  = false;
                    
    if(reg == 1)
    {
        // Set to Registered...
//        if( isRegistered == false )
        {
            document.getElementById("reg_icon_id").innerHTML = szRegIconReg;     // reg_yes.png
            isRegistered = true;

/*
4/14/15: No longer change backgrounds if registered or unregistered...
            // Only change the background if not IOS.   IOS has problem scaling new background on the fly.                
            if( window.device.platform != iOSPlatform )
            {
                $('body').css("background","white url('../www/img/hbackground_reg.png') no-repeat fixed center bottom");
            }
*/
            
        }
    }
    else
    {
        // Set to NOT Registered...
//        if( isRegistered == true )
        {
            document.getElementById("reg_icon_id").innerHTML = szRegIconNotReg;    // reg_no.png   line across
            isRegistered = false;
            
/*
4/14/15: No longer change backgrounds if registered or unregistered...
            // Only change the background if not IOS.   IOS has problem scaling new background on the fly.                
            if( window.device.platform != iOSPlatform )
            {
                $('body').css("background","white url('../www/img/hbackground.png') no-repeat fixed center bottom");
            }
*/
            
        }
    }
}

// UpdateRegButton....................................................................................
function UpdateRegButton(reg)
{
    if(reg == 1)
    {
        // Already registered so remove button and disable.
        document.getElementById("reg_button_id").innerHTML = "";
        document.getElementById("reg_button_id").disabled  = true;
    }
    else
    {
        // Not registered so add button and enable...
        document.getElementById("reg_button_id").innerHTML = "<img src='img/button_Register.png' />";
        document.getElementById("reg_button_id").disabled  = false;
    }
}



// FixCloudVer....................................................................................
function FixCloudVer(ver)
{
    var inVer = ver;

    // First check to make sure that there is a period "." in the string...
    if( ver.search(/\x2E/) != -1 )
    {
        // 700.xxx.yyy.zzz in xxx.yyy.zzz out
        var str1 = ver.substring(ver.search(/\x2E/) + 1);           // 0x2E is a period ".".
        
        
        // xxx.yyy.zzz in yyy.zzz out.
        var str2 = str1.substring(str1.search(/\x2E/) + 1);         // 0x2E is a period ".".
        
        // Make sure that there is at least one more period in the string...
        if( str2.search(/\x2E/) != -1 )
        {
            ver = str2;
            
            // Make sure that it is zero loaded up front... xxx.yyy
            if( ver.length < 7 )
            {
                str1 = ver.substring(0,ver.search(/\x2E/));         // grab xxx
                str2 = ver.substring(ver.search(/\x2E/) + 1);       // grab yyy
                
                if( str1.length == 1 )                        // test for x.yyy
                {
                    str1 = "00" + str1;
                }
                else if( str1.length == 2 )                   // test for xx.yyy
                {
                    str1 = "0" + str1;
                }
                
                if( str2.length == 1 )                        // test for xxx.y
                {
                    str2 = "00" + str2;
                }
                else if( str2.length == 2 )                   // test for xxx.yy
                {
                    str2 = "0" + str2;
                }
                
                ver = str1 + "." + str2;
            }
        }
    }    
    
    PrintLog(1, "FixCloudVer() in =" + inVer + " out=" + ver );

    return( ver );
}



// ProcessEgressResponse......................................................................................
function ProcessEgressResponse(eg)
{
    var i;
    var egStr;
    
    //  Set items loook like....    
    // {set:[
    //          {items:{firstName:"John"},priority:0},
    //          {items:{lastName:"Doe"},priority:0},
    //          {items:{city:"San Clemente"},priority:0},
    //          {items:{getUserInfoAction:"true"},priority:0},
    //      ]  
    //  } ;
    
    egStr = JSON.stringify(eg);
    if( egStr.search("set") != -1 )
    {
        PrintLog(1, "Egress: Number of set items equals " + eg.set.length );
    
        for( i = 0; i < eg.set.length; i++ )
        {
            egStr = JSON.stringify(eg.set[i].items);
            
            // Search for strings associated with getUserInfoAction (search() returns -1 if no match found)
            //   getUserInfoAction returns false if there is no information but set bGotUserInfoRspFromCloud
            //   just to know that the cloud has returned nothing or something.
            if(      egStr.search("getUserInfoAction") != -1 )   bGotUserInfoRspFromCloud   = true;        
            else if( egStr.search("firstName")         != -1 )   szRegFirstName             = eg.set[i].items.firstName;        
            else if( egStr.search("lastName")          != -1 )   szRegLastName              = eg.set[i].items.lastName;        
            else if( egStr.search("addr_1")            != -1 )   szRegAddr1                 = eg.set[i].items.addr_1;        
            else if( egStr.search("addr_2")            != -1 )   szRegAddr2                 = eg.set[i].items.addr_2;
            else if( egStr.search("city")              != -1 )   szRegCity                  = eg.set[i].items.city;
            else if( egStr.search("state")             != -1 )   szRegState                 = eg.set[i].items.state;
            else if( egStr.search("zip")               != -1 )   szRegZip                   = eg.set[i].items.zip;
            else if( egStr.search("country")           != -1 )   szRegCountry               = eg.set[i].items.country;
            else if( egStr.search("phone")             != -1 )   szRegPhone                 = eg.set[i].items.phone;
                    
            // Search for strings associated with Registration egress...
            else if( egStr.search("regOpForce")        != -1 )   myRegOpForce               = eg.set[i].items.regOpForce;       // true to force
            else if( egStr.search("regDataFromOp")     != -1 )   myRegDataFromOp            = eg.set[i].items.regDataFromOp;
    
            
            // Search for strings associated with Software Download egress...
            else if( egStr.search("isUpdateAvailable") != -1 )  {isUpdateAvailableFromCloud     = eg.set[i].items.isUpdateAvailable;  bGotUpdateAvailableRspFromCloud  = true;}
            else if( egStr.search("SwVerNU_CF_CldVer") != -1 )  {nxtySwVerNuCfCld               = eg.set[i].items.SwVerNU_CF_CldVer;  bNeedNuCfCldId    = true;}
            else if( egStr.search("SwVerCU_CF_CldVer") != -1 )  {nxtySwVerCuCfCld               = eg.set[i].items.SwVerCU_CF_CldVer;  bNeedCuCfCldId    = true;}
            else if( egStr.search("SwVerNU_PIC_CldVer") != -1 ) {nxtySwVerNuPicCld              = eg.set[i].items.SwVerNU_PIC_CldVer; bNeedNuPicCldId   = true;}
            else if( egStr.search("SwVerCU_PIC_CldVer") != -1 ) {nxtySwVerCuPicCld              = eg.set[i].items.SwVerCU_PIC_CldVer; bNeedCuPicCldId   = true;}
            else if( egStr.search("SwVer_BT_CldVer")    != -1 ) {nxtySwVerBtCld                 = eg.set[i].items.SwVer_BT_CldVer;    bNeedBtCldId      = true;}
        }
        
        
        // Remove the "700.xxx" from the "700.xxx.yyy.zzz" cloud string.
        nxtySwVerNuCfCld  = FixCloudVer(nxtySwVerNuCfCld);
        nxtySwVerCuCfCld  = FixCloudVer(nxtySwVerCuCfCld);
        nxtySwVerNuPicCld = FixCloudVer(nxtySwVerNuPicCld);
        nxtySwVerCuPicCld = FixCloudVer(nxtySwVerCuPicCld);
        nxtySwVerBtCld    = FixCloudVer(nxtySwVerBtCld);
    }


    // packages look like...
    // {packages:[
    //                  {id:641, instructions:[
    //                      {@type:down, id:921, fn:"WuExecutable.sec", fp:"."}], priority:0, time:1414810929705},
    //                  {id:642, instructions:[
    //                      {@type:down, id:922, fn:"BTFlashImg.bin", fp:"."}], priority:0, time:1414810929705}
    //               ]

    egStr = JSON.stringify(eg);
    if( egStr.search("packages") != -1 )
    {
        PrintLog(1, "Egress: Number of package instructions equals " + eg.packages.length );
        
        // Find the fixed file names and save the file ID numbers.   Note that the first ID is the package ID.
        //  File name "PICFlashImg.bin" is used for both the NU and CU PICs.
        //  Future proof in case there are different PIC images: "NuPICFlashImg.bin" and "CuPICFlashImg.bin"
        for( i = 0; i < eg.packages.length; i++ )
        {
            egStr = JSON.stringify(eg.packages[i].instructions);
            
            var packageId = eg.packages[i].id;
            SendCloudEgressStatus(packageId, 0);    // Indicate QUEUED
            SendCloudEgressStatus(packageId, 2);    // Indicate SUCCESS
            
            // Search for strings associated with software download (search() returns -1 if no match found)
            if(      egStr.search(myNuCfFileName)   != -1 )   fileNuCfCldId   = eg.packages[i].instructions[0].id;        
            else if( egStr.search(myCuCfFileName)   != -1 )   fileCuCfCldId   = eg.packages[i].instructions[0].id;  
            else if( egStr.search("PICFlashImg")    != -1 )   fileNuPicCldId  = fileCuPicCldId = eg.packages[i].instructions[0].id;  
            else if( egStr.search(myNuPicFileName)  != -1 )   fileNuPicCldId  = eg.packages[i].instructions[0].id;                     // Future proof  
            else if( egStr.search(myCuPicFileName)  != -1 )   fileCuPicCldId  = eg.packages[i].instructions[0].id;                     // Future proof
            else if( egStr.search(myBtFileName)     != -1 )   fileBtCldId     = eg.packages[i].instructions[0].id;
        }
        

        // See if we received all needed packages after we received the set...
        if( isUpdateAvailableFromCloud )
        {  
            if( (bNeedNuCfCldId    && (fileNuCfCldId  == 0)) || 
                (bNeedCuCfCldId    && (fileCuCfCldId  == 0)) || 
                (bNeedNuPicCldId   && (fileNuPicCldId == 0)) || 
                (bNeedCuPicCldId   && (fileCuPicCldId == 0)) || 
                (bNeedBtCldId      && (fileBtCldId    == 0)) )
            {
                bGotPackageAvailableRspFromCloud = false;    
            }
            else
            {
                bGotPackageAvailableRspFromCloud = true;    
            }
        }
        
    }  
    
    PrintLog(1, "Egress:  bGotUpdateAvailableRspFromCloud=" + bGotUpdateAvailableRspFromCloud + " isUpdateAvailableFromCloud=" + isUpdateAvailableFromCloud + " bGotPackageAvailableRspFromCloud=" + bGotPackageAvailableRspFromCloud );    
    
}



// SendCloudAsset............................................................................................
function SendCloudAsset()
{
    if( isNxtyStatusCurrent && isNxtySnCurrent && isNetworkConnected )
    {
        myModel = "MN" + nxtyRxStatusBoardConfig;
//        myModel = "LNTModel";

        // Set the ping rate to 0 so egress queue times out and resets quickly.
        var myAsset    = "{'id': {'mn':'" + myModel + "', 'sn':'" + mySn + "', 'tn': '0' }, 'pingRate': 0 }";
        var myAssetUrl = myPlatformUrl + "assets/1";
        
        PrintLog( 1, "SendCloudAsset: " + myAssetUrl + "  " + myAsset );
        
        
        $.ajax({
            type       : "POST",
            url        : myAssetUrl,
            contentType: "application/json;charset=utf-8",
            data       : myAsset,
            dataType   : 'json',    // response format
            success    : function(response) 
                        {
                            PrintLog( 1, "Response success: SendCloudAsset()..." + JSON.stringify(response) );
                            if( response != null )
                            {
                                ProcessEgressResponse(response);
                            }
                        },
            error      : function(response) 
                        {
                            PrintLog( 99, "Response error: SendCloudAsset()..." + JSON.stringify(response) );
                        }
        });
        
        
    }
    else
    {
        if(  isNetworkConnected == false )
        {
            PrintLog( 99, "SendCloudAsset: No network connection (WiFi or Cell)." );
        }
        else
        {
            PrintLog( 99, "SendCloudAsset: Model and SN not available yet" );
        }
    }
}

// SendCloudData............................................................................................
function SendCloudData(dataText)
{
    if( (myModel != null) && (mySn != null) && isNetworkConnected )
    {
        var myData    = "{'data':[{'di': {" + dataText + "}}]}";
        var myDataUrl = myPlatformUrl + "data/1/" + myModel + "!" + mySn;
        
        PrintLog( 1, "SendCloudData: " + myDataUrl + "  " + myData );
        
        
        $.ajax({
            type       : "POST",
            url        : myDataUrl,
            contentType: "application/json;charset=utf-8",
            data       : myData,
            dataType   : 'json',    // response format
            success    : function(response) 
                        {
                            PrintLog( 1, "Response success: SendCloudData()..." + JSON.stringify(response)  );
                            if( response != null )
                            {
                                ProcessEgressResponse(response);
                            }
                        },
            error      : function(response) 
                        {
                            PrintLog( 99, "Response error: SendCloudData()..." + JSON.stringify(response) );
                        }
        });


        
    }
    else
    {
        if(  isNetworkConnected == false )
        {
            PrintLog( 99, "SendCloudData: No network connection (WiFi or Cell)." );
        }
        else
        {
            PrintLog( 99, "SendCloudData: Model and SN not available yet. myModel=" + myModel + " mySn=" + mySn );
        }
    }
    
}

// SendCloudLocation............................................................................................
function SendCloudLocation(lat, long)
{
    if( (myModel != null) && (mySn != null) && isNetworkConnected )
    {
        var myData    = "{'locations':[{'latitude':" + lat + ", 'longitude':" + long + "}]}";
        var myDataUrl = myPlatformUrl + "data/1/" + myModel + "!" + mySn;
        
        PrintLog( 1, "SendCloudLocation: " + myDataUrl + "  " + myData );
        
        
        $.ajax({
            type       : "POST",
            url        : myDataUrl,
            contentType: "application/json;charset=utf-8",
            data       : myData,
            dataType   : 'json',    // response format
            success    : function(response) 
                        {
                            PrintLog( 1, "Response success: SendCloudLocation()..." + JSON.stringify(response) );
                            if( response != null )
                            {
                                ProcessEgressResponse(response);
                            }
                        },
            error      : function(response) 
                        {
                            PrintLog( 99, "Response error: SendCloudLocation()..." + JSON.stringify(response) );
                        }
        });
        
        
    }
    else
    {
        if(  isNetworkConnected == false )
        {
            PrintLog( 99, "SendCloudLocation: No network connection (WiFi or Cell)." );
        }
        else
        {
            PrintLog( 99, "SendCloudLocation: Model and SN not available yet" );
        }
    }

    
}


// 'http://nextivity-sandbox-connect.axeda.com/ammp/packages/1/1879/status/MN7!900425000022

// SendCloudEgressStatus............................................................................................
function SendCloudEgressStatus(packageId, myStatus)
{
    if( (myModel != null) && (mySn != null) && isNetworkConnected )
    {
        var myData    = "{'status':" + myStatus + "}";
        var myDataUrl = myPlatformUrl + "packages/1/" + packageId + "/status/" + myModel + "!" + mySn;
        
        PrintLog( 1, "SendCloudEgressStatus: " + myDataUrl + "  " + myData );
        
        
        $.ajax({
            type       : "PUT",
            url        : myDataUrl,
            contentType: "application/json;charset=utf-8",
            data       : myData,
            dataType   : 'json',    // response format
            success    : function(response) 
                        {
                            PrintLog( 1, "Response success: SendCloudEgressStatus()..." + JSON.stringify(response) );
                            if( response != null )
                            {
                                ProcessEgressResponse(response);
                            }
                        },
            error      : function(response) 
                        {
                            PrintLog( 99, "Response error: SendCloudEgressStatus()..." + JSON.stringify(response) );
                        }
        });
        
        
    }
    else
    {
        if(  isNetworkConnected == false )
        {
            PrintLog( 99, "SendCloudEgressStatus: No network connection (WiFi or Cell)." );
        }
        else
        {
            PrintLog( 99, "SendCloudEgressStatus: Model and SN not available yet" );
        }
    }

    
}


// SendCloudPoll............................................................................................
function SendCloudPoll()
{
    if( isNxtyStatusCurrent && isNxtySnCurrent && isNetworkConnected )
    {
        var myAssetUrl = myPlatformUrl + "assets/1/" + myModel + "!" + mySn;
        
        PrintLog( 1, "SendCloudPoll: " + myAssetUrl );
        
        
        $.ajax({
            type       : "POST",
            url        : myAssetUrl,
//            contentType: "application/json;charset=utf-8",
//            data       : myAsset,
            dataType   : 'json',    // response format
            success    : function(response) 
                        {
                            PrintLog( 1, "Response success: SendCloudPoll()..." + JSON.stringify(response) );
                            if( response != null )
                            {
                                ProcessEgressResponse(response);
                            }
                        },
            error      : function(response) 
                        {
                            PrintLog( 99, "Response error: SendCloudPoll()..." + JSON.stringify(response) );
                        }
        });
        
        
    }
    else
    {
        if(  isNetworkConnected == false )
        {
            PrintLog( 99, "SendCloudPoll: No network connection (WiFi or Cell)." );
        }
        else
        {
            PrintLog( 99, "SendCloudPoll: Model and SN not available yet" );
        }
    }
}






// HandleOsConfirmation.......................................................................................
function HandleOsConfirmation(buttonIndex) 
{
    // buttonIndex = 0 if dialog dismissed, i.e. back button pressed.
    // buttonIndex = 1 if 'Ok'
    if( buttonIndex == 1 )
    {
        // Do nothing since we no longer want to kill the app.  This will force the user to manually kill.
        // Ok...Exit...Kill the app...
//        DisconnectBluetoothDevice();
//        navigator.app.exitApp();                
    }
}


// HandlePrivacyConfirmation.......................................................................................
function HandlePrivacyConfirmation(buttonIndex) 
{
    // buttonIndex = 0 if dialog dismissed, i.e. back button pressed.
    // buttonIndex = 1 if 'Ok'
    if( buttonIndex == 0 )
    {
        // If they dismiss, then give it to them again....
        navigator.notification.confirm(
            "Your privacy is important to us. Please refer to 'www.cel-fi.com/privacypolicy' for our detailed privacy policy.",    // message
            HandlePrivacyConfirmation,      // callback to invoke with index of button pressed
            'Privacy Policy',               // title
            ['Ok'] );                       // buttonLabels

        UpdateStatusLine("Please select Ok..."); 
    }
    else if( (buttonIndex == 1) || (buttonIndex == 2) )
    {
        // Ok...
        bPrivacyViewed = true;
        
        if( buttonIndex == 1 )
        {
            if( isBluetoothCnx == false )
            {
                // Start the spinner..
                SpinnerStart( "Please wait", "Searching for Cel-Fi devices..." );
                UpdateStatusLine("Searching for Cel-Fi devices...");
            }
        }
        
    }
}

// HandleUniiRetry.......................................................................................
// process the confirmation dialog result
function HandleUniiRetry(buttonIndex) 
{
    // buttonIndex = 0 if dialog dismissed, i.e. back button pressed.
    // buttonIndex = 1 if 'Retry' try again.
    // buttonIndex = 2 if 'Exit'
    if( buttonIndex == 1 )
    {
        // Retry...
        SpinnerStart( "Please wait", "Retrying..." );
        MainLoopIntervalHandle = setInterval(app.mainLoop, 1000 ); 
        nxtySwVerNuCf          = null;
        nxtySwVerCuCf          = null;      // Set to Null so new NU version gets sent to cloud.  Bug 1324
        bUniiUp                = true;
    }
    
/*
do not exit app.        
    else if( buttonIndex == 2 )
    {
        // Exit...Kill the app...
        DisconnectBluetoothDevice();
        navigator.app.exitApp();  
    }
*/
    
}

// HandleCloudRetry.......................................................................................
// process the confirmation dialog result
function HandleCloudRetry(buttonIndex) 
{
    // buttonIndex = 0 if dialog dismissed, i.e. back button pressed.
    // buttonIndex = 1 if 'Retry' try again.
    // buttonIndex = 2 if 'Exit'
    if( buttonIndex == 1 )
    {
        // Retry...
        SpinnerStart( "Please wait", "Retrying..." );
        MainLoopIntervalHandle = setInterval(app.mainLoop, 1000 );
                    
        // See if we have a network connection, i.e. WiFi or Cell.
        isNetworkConnected = (navigator.connection.type == Connection.NONE)?false:true;         
    }
    
/*
do not exit app    
    else if( buttonIndex == 2 )
    {
        // Exit...Kill the app...
        DisconnectBluetoothDevice();
        navigator.app.exitApp();  
    }
*/
    
}


// HandleExitApp.......................................................................................
function HandleExitApp(buttonIndex) 
{
    // buttonIndex = 0 if dialog dismissed, i.e. back button pressed.
    // buttonIndex = 1 if 'Exit' to exit.
    // buttonIndex = 2 if 'Cancel'
    if( buttonIndex == 1 )
    {
        // Exit...
        PrintLog(1, "Exiting app" );
        
        // Kill the app...
        DisconnectBluetoothDevice();
        
//        navigator.app.exitApp();
        
        // Kill the app in 1 S to allow BT to tidy up...
        setTimeout(navigator.app.exitApp, 1000);
    }
}



            
            
            
function showAlert(message, title) 
{
  if(window.isPhone) 
  {
    navigator.notification.alert(message, null, title, 'ok');
    
    // Save to log file...
    PrintLog(1, "Alert: " + title + " : " + message );
  } 
  else 
  {
    alert(title ? (title + ": " + message) : message);
  }
}






// ..................................................................................
var app = {
     
    // deviceready Event Handler
    //
  	// PhoneGap is now loaded and it is now safe to make calls using PhoneGap
    //
    onDeviceReady: function() {
    
        if( ImRunningOnBrowser == false )
        {
            if( window.device.platform != iOSPlatform )
            {
                // IOS did not like opening the file system this early, no error just stalled.
                OpenFileSystem();
            }
        
            PrintLog(10,  "device ready:  Running on phone version: " + window.device.version + " parseFloat:" + parseFloat(window.device.version) );
    	}
    	
    	isNxtyStatusCurrent = false;
    	isNxtySnCurrent     = false;
    	
    	if( CFG_RUN_ON_SANDBOX )
    	{
            myPlatformUrl = mySandboxPlatformUrl;
    	}
    	


		// Register the event listener if the back button is pressed...
        document.addEventListener("backbutton", app.onBackKeyDown, false);
        
        app.renderHomeView();
        
       
        
        // Only start bluetooth if on a phone...
        if( window.isPhone )
        {
            
            if( window.device.platform == iOSPlatform )
            {
                OpenFileSystem();
            
                if (parseFloat(window.device.version) >= 7.0) 
                {
                    StatusBar.hide();
                }
            } 
            
            StartBluetooth();
            
                       
        }        
    },   
       
       

    // Handle the back button
    //
    onBackKeyDown: function() 
    {
        
        if( currentView == "main" )
        {
            // Android:  Go to background mode.
            navigator.app.exitApp()
/*
do not ask to exit app.        
            navigator.notification.confirm(
                        'Do you want to exit the App?',    // message
                        HandleExitApp,                     // callback to invoke with index of button pressed
                        'Exit App',                        // title
                        ['Exit', 'Cancel'] );              // buttonLabels
*/
                        
        }
        else if( currentView == "registration" )
        {
            reg.handleBackKey();
        }
        else if( currentView == "tech" )
        {
            tech.handleBackKey();
        }
        else if( currentView == "settings" )
        {
            Stg.handleBackKey();
        }
        else if( currentView == "download" )
        {
            Dld.handleBackKey();
        }
        else
        {
            showAlert("Back to where?", "Back...");
        }
        
    },



	// Handle the Check for SW Update key
	handleSwUpdateKey: function(id)
	{
	    // Handle if button is displayed...
	    if( document.getElementById('sw_button_id').innerHTML.length > 10 )
	    {
    	 	PrintLog(1, "SW Update key pressed");
            clearInterval(MainLoopIntervalHandle);	
     	
    	 	if( isBluetoothCnx )
    	 	{
// NO_U                clearTimeout(checkUniiStatusMainTimer);
                Dld.renderDldView();  
    	 	}
            else
            {
                if( ImRunningOnBrowser )
                {
                    // Allow the browser to go into
                    Dld.renderDldView();
                }
                else
                {       
                    showAlert("SW Update mode not allowed...", "Bluetooth not connected.");
                }
            }
            
    
    // Try various things...
    
    
    /*
        
    ConvertFreqToArfcn( 0, 5, 8720);        // UARFCN=4360
    ConvertFreqToArfcn( 0, 5, 8770);        // UARFCN=4385
    ConvertFreqToArfcn( 0, 2, 19725);        // UARFCN=612 
    ConvertFreqToArfcn( 1, 17, 7390);        // EARFCN=5780 
        
    if( isRegistered )
    {
        // Unregister...
        showAlert("Just sent command to unregister...", "Unregister.");
        var u8Buff  = new Uint8Array(20);
        u8Buff[0] = 0x81;                               // Redirect to NU on entry and exit...   
        u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
        u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
        u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
        u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
        u8Buff[5] = 0xF1;                    // Note that javascript converts var to INT32 for shift operations.
        u8Buff[6] = 0xAC;
        u8Buff[7] = 0x00;
        u8Buff[8] = 0x01;
        
        nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);
    }
    else
    {
        // Register and clear Loc Lock
        showAlert("Just sent command to register and clear loc lock...", "Register.");
        var u8Buff  = new Uint8Array(20);
        u8Buff[0] = 0x01;                               // Redirect to NU on entry...   
        u8Buff[1] = (NXTY_PCCTRL_GLOBALFLAGS >> 24);    // Note that javascript converts var to INT32 for shift operations.
        u8Buff[2] = (NXTY_PCCTRL_GLOBALFLAGS >> 16);
        u8Buff[3] = (NXTY_PCCTRL_GLOBALFLAGS >> 8);
        u8Buff[4] = NXTY_PCCTRL_GLOBALFLAGS;
        u8Buff[5] = 0xF1;                    // Note that javascript converts var to INT32 for shift operations.
        u8Buff[6] = 0xAC;
        u8Buff[7] = 0x01;
        u8Buff[8] = 0x00;
        nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);
        
        
        
        u8Buff[0] = 0x80;                               // Redirect to CU on exit...   
        u8Buff[1] = 0xF0;   // CellIdTime
        u8Buff[2] = 0x00;
        u8Buff[3] = 0x00;
        u8Buff[4] = 0x2C;
        u8Buff[5] = 0xDA;   // LOC_LOCK_RESET_VAL     
        u8Buff[6] = 0xBA;
        u8Buff[7] = 0xDA;
        u8Buff[8] = 0xBA;
        
        nxty.SendNxtyMsg(NXTY_CONTROL_WRITE_REQ, u8Buff, 9);
        
    }
    */
    
    /*
    var rsp = {set:[
        {items:{firstName:"John"},priority:0},
        {items:{lastName:"Doe"},priority:0},
        {items:{city:"San Clemente"},priority:0},
        {items:{getUserInfoAction:"true"},priority:0},
        ]} ;
    */
    
    /*
    var rsp = {packages:[
                {id:641, instructions:[{"@type":"down", id:921, fn:"WuExecutable.sec", fp:"."}],priority:0,time:1414810929705},
                {id:642, instructions:[{"@type":"down", id:922, fn:"BTFlashImg.bin", fp:"."}], priority:0,time:1414810929705}
                ],
                
              set:[
                {items:{getUserInfoAction:true},priority:0},
                {items:{firstName:"John"},priority:0},
                {items:{lastName:"Doe"},priority:0},
                {items:{addr_1:"12345 Cell Rd"},priority:0},
                {items:{addr_2:"whitefield"},priority:0},
                {items:{city:"NewYorkCity"},priority:0},
                {items:{state:"Hello"},priority:0},
                {items:{zip:"56789"},priority:0},
                {items:{SwVer_BT_CldVer:"00.04"},priority:0},
                {items:{country:"USA"},priority:0},
                {items:{phone:"1112223333"},priority:0}]};                      
    
    PrintLog( 1, "Rsp..." + JSON.stringify(rsp) );
    ProcessEgressResponse(rsp);
    */    
    
    
    
    /*
    var x  = "regOpForce:true";
    var u8 = new Uint8Array(30);
    
    for( var i = 0; i < x.length; i++ )
    {
        u8[i] = x.charCodeAt(i); 
    }
    
    nxty.SendNxtyMsg(NXTY_REGISTRATION_REQ, u8, x.length ); 
    */
            
        } // if button is displayed...            
        
	},


	// Handle the Tech Mode key
	handleTechModeKey: function()
	{
	    // Handle if button is displayed...
        if( document.getElementById('tk_button_id').innerHTML.length > 10 )
        {
    	 	PrintLog(1, "Tech Mode key pressed");
            clearInterval(MainLoopIntervalHandle); 
                	 	
    	 	if( isBluetoothCnx )
    	 	{
// NO_U                clearTimeout(checkUniiStatusMainTimer);
     	 		tech.renderTechView();
    	 	}
    	 	else
    	 	{
                if( ImRunningOnBrowser )
                {
                    // Allow the browser to go into Tech mode
                    tech.renderTechView();
                }
                else
                {	 	
    	            showAlert("Tech mode not allowed...", "Bluetooth not connected.");
    	        }
    	 	}
    	 	
        }   // if button is displayed...
	},

    // Handle the Antenna key
    handleSettingsKey: function()
    {
        // Handle if button is displayed...
        if( document.getElementById('st_button_id').innerHTML.length > 10 )
        {
            PrintLog(1, "Antenna key pressed");
            clearInterval(MainLoopIntervalHandle);  
           
            if( isBluetoothCnx && bUniiUp )
            {
// NO_U                clearTimeout(checkUniiStatusMainTimer);
                Stg.renderSettingsView();
            }
            else
            {
                if( ImRunningOnBrowser )
                {
                    // Allow the browser to go into Settings mode
                    Stg.renderSettingsView();
                }
                else
                {       
                    if( isBluetoothCnx == false )
                    {
                        showAlert("Antenna mode not allowed...", "Bluetooth not connected.");
                    }
                    else
                    {
                        showAlert("Antenna mode not allowed...", "Wireless link down");
                    }
                }
            }
        }   // If button is displayed
    },

	// Handle the Register key
	handleRegKey: function()
	{
        // Handle if button is displayed...
        if( document.getElementById('reg_button_id').innerHTML.length > 10 )
        {
    	 	PrintLog(1, "Reg key pressed");
            clearInterval(MainLoopIntervalHandle);  
    	 	
            if( isBluetoothCnx && bUniiUp )
    	 	{
// NO_U    	 	    clearTimeout(checkUniiStatusMainTimer);
    	 	    SendCloudPoll();
    			reg.renderRegView();
    	 	}
    	 	else
    	 	{
                if( ImRunningOnBrowser )
                {
                    reg.renderRegView();
                }
                else
                {
                    if( isBluetoothCnx == false )
                    {
                        showAlert("Registration mode not allowed...", "Bluetooth not connected.");
                    }
                    else
                    {
                        showAlert("Registration mode not allowed...", "Wireless link down.");
                    }
                }
    	 	}
        }   // if button is displayed
	},
	
	


	renderHomeView: function() 
	{
// NO_U        var myUniiIcon      = (bUniiStatusKnown && bUniiUp) ? szUniiIconButton + szUniiIconUp + "</button>" : szUniiIconButton + szUniiIconDown + "</button>";
        var myBluetoothIcon = isBluetoothCnx ? szBtIconButton + szBtIconOn + "</button>" : szBtIconButton + szBtIconOff + "</button>";
        var myRegIcon       = (nxtyRxRegLockStatus == 0x00) ? szRegIconButton + "</button>" : isRegistered ? szRegIconButton + szRegIconReg + "</button>" : szRegIconButton + szRegIconNotReg + "</button>";
		
		var myHtml = 
			"<img src='img/header_main.png' width='100%' />" +
			
// NO_U			myUniiIcon +
   			myBluetoothIcon +
            myRegIcon +
   			"<button id='sw_button_id'  type='button' class='mybutton' onclick='app.handleSwUpdateKey()'></button>" +
			"<button id='tk_button_id'  type='button' class='mybutton' onclick='app.handleTechModeKey()'></button>" +
            "<div id='st_button_div_id'></div>" +
  			"<button id='reg_button_id' type='button' class='mybutton' onclick='app.handleRegKey()'></button>" +
  			
  			
  			szMyStatusLine;
  			

		$('body').html(myHtml); 
		
	    
	    // Make the ICONs change when touched...  
        document.getElementById("bt_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
        document.getElementById("bt_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
        document.getElementById("reg_icon_id").addEventListener('touchstart', HandleButtonUp );     // up, adds transparency
        document.getElementById("reg_icon_id").addEventListener('touchend',   HandleButtonDown );   // down, back to normal, no transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
	    
	      
 		document.getElementById("sw_button_id").addEventListener('touchstart', HandleButtonDown );
 		document.getElementById("sw_button_id").addEventListener('touchend',   HandleButtonUp );
 		
 		document.getElementById("tk_button_id").addEventListener('touchstart', HandleButtonDown );
 		document.getElementById("tk_button_id").addEventListener('touchend',   HandleButtonUp );
 		
 		document.getElementById("reg_button_id").addEventListener('touchstart', HandleButtonDown );
 		document.getElementById("reg_button_id").addEventListener('touchend',   HandleButtonUp );


        // Start with the buttons disabled...
        document.getElementById("sw_button_id").disabled  = true;
        document.getElementById("tk_button_id").disabled  = true;
        document.getElementById("reg_button_id").disabled = true; 
        
        // Disable the reg icon just in case it does not get displayed... 
        document.getElementById("reg_icon_id").disabled  = true;
		
		uMainLoopCounter = 0;

			
        // Throw the buttons up for testing... 
        if( ImRunningOnBrowser )
        {
            document.getElementById("sw_button_id").innerHTML = "<img src='img/button_SwUpdate.png' />";
            document.getElementById("tk_button_id").innerHTML = "<img src='img/button_TechMode.png' />";
            document.getElementById("st_button_div_id").innerHTML = "<button id='st_button_id'  type='button' class='mybutton' onclick='app.handleSettingsKey()'><img src='img/button_Settings.png' /></button>";
                        
            document.getElementById("reg_button_id").innerHTML = "<img src='img/button_Register.png' />";  
            
            // Enable the buttons...
            document.getElementById("sw_button_id").disabled  = false;
            document.getElementById("tk_button_id").disabled  = false;
            document.getElementById("reg_button_id").disabled = false; 
        }
        else
        {
            // Check the OS version.
            // Android must be >= 4.4.2 for WebSocket and Bluetooth LE plugin
            // IOS     must be >= 7.1   for WebSocket and Bluetooth LE plugin.
            PrintLog(1, "Phone Model: " + window.device.model + "  OS: " + window.device.platform + " Ver: " + window.device.version );
            if( ((window.device.platform == androidPlatform) && (parseFloat(window.device.version) < 4.4))      ||
                ((window.device.platform == iOSPlatform)     && (parseFloat(window.device.version) < 7.1))      )
            {
                PrintLog(1, "Phone's Operating System is out of date.   Please upgrade to latest version." );
                
                navigator.notification.confirm(
                    'Phone Operating System is out of date.   Please upgrade to latest version.  Exiting Wave App.',    // message
                    HandleOsConfirmation,                   // callback to invoke with index of button pressed
                    'Update Phone Software',                // title
                    ['Ok'] );                               // buttonLabels
            } 
            else
            {
                // Start the handler to be called every second...
                MainLoopIntervalHandle = setInterval(app.mainLoop, 1000 );
            } 
        }
        

        
        
        
                
//        PrintLog(1, "Screen density: low=0.75 med=1.0 high=1.5  This screen=" +  window.devicePixelRatio );    
                        
//        PrintLog(1, "FixCloudVer('700.999.1.255)=" + FixCloudVer('700.999.1.255') );    
                        
                        
        currentView = "main";
	},


	initialize: function() 
	{
		if( ImRunningOnBrowser )
		{
			PrintLog(10, "running on browser");
	
	
	        // Browser...
	        window.isPhone = false;
	        isRegistered   = false;
	        this.onDeviceReady();
	    }
	    else
	    {
		 	PrintLog(10, "running on phone");
		 	
	        // On a phone....
	        window.isPhone = true;
		 		        
	        // Call onDeviceReady when PhoneGap is loaded.
	        //
	        // At this point, the document has loaded but phonegap-1.0.0.js has not.
	        // When PhoneGap is loaded and talking with the native device,
	        // it will call the event `deviceready`.
	        // 
	        document.addEventListener('deviceready', this.onDeviceReady, false);
        }

	},




	mainLoop: function() 
	{
        var u8TempBuff = new Uint8Array(20);  
		PrintLog(4, "App: Main loop..." );
		
		
		
		if( bCheckBluetoothOnStartup )
		{
    		if( isBluetoothStarted == false )
    		{
    		  // Do nothing until bluetooth has started...
    		  return;
    		}
    		else
    		{
                // Bluetooth is not connected...see if user enabled...
                if( isBluetoothEnabled == false )
                {
                    if( uMainLoopCounter == 0 )
                    {
                        SpinnerStart( "Bluetooth Required", "Exiting App..." );
                        UpdateStatusLine( "Bluetooth Required: Exiting App..." );
                    }
                    
                    if( ++uMainLoopCounter >= 4 )
                    {
                        // Kill the app...
                        navigator.app.exitApp();
                    }
                    
                    return;
                }
                else
                {
                    // Normal flow should come here once bluetooth has been enabled...
                    bCheckBluetoothOnStartup = false;

                    // Privacy policy...
                    navigator.notification.confirm(
                        "Your privacy is important to us. Please refer to 'www.cel-fi.com/privacypolicy' for our detailed privacy policy.",    // message
                        HandlePrivacyConfirmation,      // callback to invoke with index of button pressed
                        'Privacy Policy',               // title
                        ['Ok'] );                       // buttonLabels
        
                    UpdateStatusLine("Privacy policy..."); 
                                       
                }
    		}
        }
		
		if( bPrivacyViewed == false )
		{
          if( CFG_RUN_ON_SANDBOX )
          {
            var jText = "App sw: " + szVerApp + "(S)  Cel-fi BT sw: " + swVerBtScan;
          }
          else
          {
            var jText = "App sw: " + szVerApp + "(P)  Cel-fi BT sw: " + swVerBtScan;
          }
                
          UpdateStatusLine( jText );
          PrintLog(1, jText );
          return;
		}
		
		
		
		// ------------------------------------------------------------------------------------------
        if( isBluetoothCnx && (bNaking == false) )
        {
            if( isNxtyStatusCurrent == false )
            {
                if( uMainLoopCounter == 0 )
                {
                    // See if we have a network connection, i.e. WiFi or Cell.
                    isNetworkConnected = (navigator.connection.type == Connection.NONE)?false:true;
                    
                    // Start the spinner..
                    SpinnerStart( "Please wait", "Syncing data..." );
                    
                }
                
                // Get the status...returns build config which is used as model number
                UpdateStatusLine("Retrieving model number...");
                nxty.SendNxtyMsg(NXTY_STATUS_REQ, null, 0);
            } 
            else if( isNxtySnCurrent == false )
            {
                UpdateStatusLine("Retrieving serial number...");
                
                // Get the CU serial number...used by the platform 
                nxtyCurrentReq  = NXTY_SEL_PARAM_REG_SN_TYPE;
                u8TempBuff[0]   = NXTY_SW_CF_CU_TYPE;     // Select CU
                u8TempBuff[1]   = 9;                      // System SN MSD
                u8TempBuff[2]   = 8;                      // System SN LSD  
                nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8TempBuff, 3);

                bSentCloud = false;
            }
            else if( nxtySwVerNuCf == null )
            {
                UpdateStatusLine("Retrieving NU SW version...");

                if( bSentCloud == false )
                {
                    // We now have both the status and SN so notify the cloud that we are here...
                    SendCloudAsset();
                    SendCloudData( "'SerialNumber':'" + mySn + "'" );

                
                    // Register for push notifications after we can communicate with the cloud
                    // so we can send our regID.
                    if( window.device.platform == androidPlatform )
                    {
                        InitGcmPush('deviceready');
                        SendCloudData( "'DeviceType':'Android'" );
                    }
                    else if( window.device.platform == iOSPlatform )
                    {
                        InitIosPush('deviceready');
                        SendCloudData( "'DeviceType':'IOS'" );                        
                    }
                
                    bSentCloud = true;
                }

    
                if( bUniiUp )  // up by default...
                {
                    if( (msgRxLastCmd == NXTY_NAK_RSP) && (nxtyLastNakType == NXTY_NAK_TYPE_UNIT_REDIRECT) )
                    {
                        // Bypass getting NU Sw Ver which we need for the reg info.
                        nxtySwVerNuCf = "88.88.88";
                        
                        // Cancel and wait at least 5 seconds.
                        cancelUartRedirect();
                    }
                    else if( (msgRxLastCmd == NXTY_NAK_RSP) && (nxtyLastNakType == NXTY_NAK_TYPE_TIMEOUT) )
                    {
                        // Since this message is going to the NU and we did not recieve it last time, allow 6 seconds
                        // after the NAK before sending again to allow the NU redirect to time out in 5..
                        clearInterval(MainLoopIntervalHandle);
                        MainLoopIntervalHandle = setInterval(app.mainLoop, 6000 ); 
                        
                        // Make sure we do not come back here in 6 seconds...
                        msgRxLastCmd = NXTY_INIT;
                    }
                    else
                    {
                        // Get the Cell Fi software version from the NU...
                        nxtyCurrentReq    = NXTY_SW_CF_NU_TYPE;
                        u8TempBuff[0]     = nxtyCurrentReq;
                        nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8TempBuff, 1);

                        // Since this message is going to the NU, allow 4 seconds to receive the response..
                        clearInterval(MainLoopIntervalHandle);
                        MainLoopIntervalHandle = setInterval(app.mainLoop, 4000 );
                    }
                }
                else
                {
                    // Bypass getting NU Sw Ver which we need for the reg info.
                    nxtySwVerNuCf = "99.99.99";
                }
            }
            else if( nxtySwVerCuCf == null )
            {
                UpdateStatusLine("Retrieving CU SW version...");

                // We now have the NU SW Ver message response which has the register/lock information...
                
                // We now have the Cel-Fi SW version so send the data to the cloud
                SendCloudData( "'SwVerNU_CF':'" + SwPnNuCu + nxtySwVerNuCf + "', 'BuildId_CF':'"  + nxtySwBuildIdNu + "'" );

                // Get ready to receive user information for populating the registration info page
//                SendCloudData( "'getUserInfoAction':'false'" );


                // Crank it up just a little since we are no longer talking to the NU...
                clearInterval(MainLoopIntervalHandle);
                MainLoopIntervalHandle = setInterval(app.mainLoop, 2000 );
                            
            
                // Get the CU software version...
                nxtyCurrentReq    = NXTY_SW_CF_CU_TYPE;
                u8TempBuff[0]     = nxtyCurrentReq;
                nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8TempBuff, 1);                
            }            
            else if( nxtySwVerCuPic == null )
            {
                UpdateStatusLine("Retrieving CU PIC SW version...");
            
                // We now have the CU SW version so send the data to the cloud
                SendCloudData( "'SwVerCU_CF':'" + SwPnNuCu + nxtySwVerCuCf + "'" );
                    
                // Request user information...
                bGotUserInfoRspFromCloud = true;                        // jdo: 1/22/15:  No longer want to prefill data.
//                SendCloudData( "'getUserInfoAction':'true'" );
                                    
                // Get the CU PIC software version...
                nxtyCurrentReq    = NXTY_SW_CU_PIC_TYPE;
                u8TempBuff[0]     = nxtyCurrentReq;
                nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8TempBuff, 1);                
            }
            else if( nxtySwVerNuPic == null )
            {
                UpdateStatusLine("Retrieving NU PIC SW version...");                             

                // We now have the CU PIC SW version so send the data to the cloud
                SendCloudData( "'SwVerCU_PIC':'" + SwPnPic + nxtySwVerCuPic + "'" );
                            
                // Get the NU PIC software version...
                nxtyCurrentReq    = NXTY_SW_NU_PIC_TYPE;
                u8TempBuff[0]     = nxtyCurrentReq;
                nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8TempBuff, 1);   
            }
            else if( nxtySwVerBt == null )
            {
                UpdateStatusLine("Retrieving Bluetooth SW version...");                             

                // We now have the NU PIC SW version so send the data to the cloud
                SendCloudData( "'SwVerNU_PIC':'" + SwPnPic + nxtySwVerNuPic + "'" );
                            
                // Get the BT software version...
                nxtyCurrentReq    = NXTY_SW_BT_TYPE;
                u8TempBuff[0]     = nxtyCurrentReq;
                nxty.SendNxtyMsg(NXTY_SW_VERSION_REQ, u8TempBuff, 1);                
            }
            else if( (bExtAntCheckComplete == false) && (bUniiUp == true) )
            {
                // If UNII is not up, fall through and allow user to select retry below...
                UpdateStatusLine("Retrieving External Antenna Status...");

                if( iExtAntCheckSubState == 0 )
                {
                    // The link should be closed...
                    nxtyCurrentReq  = NXTY_SEL_PARAM_ANT_STATUS;
                    u8TempBuff[0]   = NXTY_SW_CF_NU_TYPE;               // Indicate NU redirect and get it from the NU...   
                    u8TempBuff[1]   = NXTY_SEL_PARAM_ANT_STATUS;        // SelParamReg 1: AntennaStatus
                    u8TempBuff[2]   = NXTY_SEL_PARAM_ANT_STATUS;        // SelParamReg 2: AntennaStatus
                    nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8TempBuff, 3);
                
                    iExtAntCheckSubState++;
                }
                else if( iExtAntCheckSubState == 1 )
                {
                    // Wait on the response from the SYS_INFO request above...
                    if( window.msgRxLastCmd == NXTY_SYS_INFO_RSP )
                    {
                        bExtAntCheckComplete = true;
                    }
                    else if( window.msgRxLastCmd == NXTY_NAK_RSP )
                    {
                        // Try again...   
//                        if( nxtyLastNakType == NXTY_NAK_TYPE_TIMEOUT )
                        {
                            iExtAntCheckSubState = 0;                        
                
                            // Since this message is going to the NU and we did not recieve it last time, allow 6 seconds
                            // after the NAK before sending again to allow the NU redirect to time out in 5..
                            clearInterval(MainLoopIntervalHandle);
                            MainLoopIntervalHandle = setInterval(app.mainLoop, 6000 ); 
                        }
                    }
                }                

            }
            else if( nxtyUniqueId == null )
            {
                UpdateStatusLine("Retrieving Unique ID...");
            
                // Crank it up since we are no longer talking to the NU...
                clearInterval(MainLoopIntervalHandle);
                MainLoopIntervalHandle = setInterval(app.mainLoop, 1000 );
                
                // We now have the BT SW version so send the data to the cloud
                SendCloudData( "'SwVer_BT':'" + SwPnBt + nxtySwVerBt + "', 'OperatorCode':'" + myOperatorCode + "'"  );

                                
                // Get the Unique ID...
                nxtyCurrentReq  = NXTY_SEL_PARAM_REG_UID_TYPE;
                u8TempBuff[0]   = NXTY_SW_CF_CU_TYPE;
                u8TempBuff[1]   = 2;                      // Unique ID MSD
                u8TempBuff[2]   = 1;                      // Unique ID LSD  
                nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8TempBuff, 3);
    
                uMainLoopCounter = 0;
                
                
                // Set the isRegistered var temporarily to determine if we need to poll for cloud data or not...
                if( (nxtyRxRegLockStatus == 0x0B) || (nxtyRxRegLockStatus == 0x07) ||       // State 8 (0x0B) or 12 (0x07)
                    (nxtyRxRegLockStatus == 0x08) || (nxtyRxRegLockStatus == 0x09) ||       // State 5 (0x08) or 6  (0x09)
                    (nxtyRxRegLockStatus == 0x04) || (nxtyRxRegLockStatus == 0x05) )        // State 9 (0x04) or 10 (0x05)
                {
                    // Not registered.
                    isRegistered = false;
                }
                else if( nxtyRxRegLockStatus & 0x02 )
                {
                    isRegistered = true;    
                }
                
                                        
            }
            else if( (isRegistered == false) && (bGotUserInfoRspFromCloud == false) && (uMainLoopCounter < (MAIN_LOOP_COUNTER_MAX - 2)) )
            {
                // Only need to stay here and try to get the user's lastName/firstName etc. data from the cloud if we are not registered or are regegistering.
                SendCloudPoll();
                UpdateStatusLine("Syncing User Info from platform ... " + uMainLoopCounter); 
            }
            else 
            {
                if( msgRxLastCmd == NXTY_SYS_INFO_RSP )
                {
                    // We just received the Unique ID send the data to the cloud
                    SendCloudData( "'UniqueId':'" + nxtyUniqueId + "'" );
    
                    UpdateStatusLine("Retrieving SKU number...");
                    GetSkuFromUniqueId(); 
                }
                

                // Clear the loop timer to stop the loop...
                clearInterval(MainLoopIntervalHandle);
                SpinnerStop();
                uMainLoopCounter = 0;
                    
                if( bUniiUp == false )
                {   
                    var eText = "Wireless link between the Network Unit and Coverage Unit is down.  Please wait for the link to connect and try again.";
                    UpdateStatusLine( eText + "<br>Connected to: " + myModel + ":" + mySn );            
                    navigator.notification.confirm(
                        eText,    // message
                        HandleUniiRetry,                    // callback to invoke with index of button pressed
                        'Wireless Link Down',               // title
                        ['Retry'] );                        // buttonLabels                                     
                }
                else if( isNetworkConnected == false )
                {
                    var eText = "Unable to connect to cloud, no WiFi or Cell available.";
                    showAlert( eText, "Network Status.");
                    UpdateStatusLine( eText + "<br>Connected to: " + myModel + ":" + mySn );
                    navigator.notification.confirm(
                        eText,    // message
                        HandleCloudRetry,                    // callback to invoke with index of button pressed
                        'No WiFi or Cell',                   // title
                        ['Retry'] );                 // buttonLabels                                     
                                                 
                }
                else if( (nxtyRxRegLockStatus == 0x01) || (nxtyRxRegLockStatus == 0x03) )     // State 2 (0x01) or state 4 (0x03):  Loc Lock bit set.
                {
                    var eText;
                    if( nxtyRxRegLockStatus == 0x01 )
                    {
                        eText = "Please call your service provider. (Reg State 2)";
                    }
                    else
                    {
                        eText = "Please call your service provider. (Reg State 4)";
                    }
                    showAlert( eText, "Location Lock Set.");
                    UpdateStatusLine( eText + "<br>Connected to: " + myModel + ":" + mySn );                             
                }  
                else
                {
                
                    // No critical alerts so post the buttons....
                    document.getElementById("sw_button_id").innerHTML = "<img src='img/button_SwUpdate.png' />";
                    document.getElementById("tk_button_id").innerHTML = "<img src='img/button_TechMode.png' />";

                    
                    
                    // Enable the buttons...
                    document.getElementById("sw_button_id").disabled  = false;
                    document.getElementById("tk_button_id").disabled  = false;
                    
                    // Only display the Antenna button if external antenna is available on this unit.                
                    if( (bExtAntCheckComplete == true) && (bExtAntAvailable == true) )
                    {
                        document.getElementById("st_button_div_id").innerHTML = "<button id='st_button_id'  type='button' class='mybutton' onclick='app.handleSettingsKey()'><img src='img/button_Settings.png' /></button>";
                        document.getElementById("st_button_id").disabled  = false;
                        document.getElementById("st_button_id").addEventListener('touchstart', HandleButtonDown );
                        document.getElementById("st_button_id").addEventListener('touchend',   HandleButtonUp );
                    } 


                    UpdateStatusLine( "Select button...<br>Connected to: " + myModel + ":" + mySn );                             

                    if( (nxtyRxRegLockStatus == 0x0B) || (nxtyRxRegLockStatus == 0x07) )     // State 8 (0x0B) or 12 (0x07)
                    {
                        UpdateRegButton(0);     // Add the reg button.
                        UpdateRegIcon(0);       // Set reg ICON to not registered...
                        showAlert("Please re-register your device by selecting the register button.", "Registration Required.");
                    }                            
                    else if( (nxtyRxRegLockStatus == 0x08) || (nxtyRxRegLockStatus == 0x09) ||    // State 5 (0x08) or 6  (0x09)
                             (nxtyRxRegLockStatus == 0x04) || (nxtyRxRegLockStatus == 0x05) )     // State 9 (0x04) or 10 (0x05)
                    {
                        UpdateRegButton(0);     // Add the reg button.
                        UpdateRegIcon(0);       // Set reg ICON to not registered...
                        showAlert("Please register your device by selecting the register button.", "Registration Required.");
                    }
                    else
                    {
                        if( nxtyRxRegLockStatus & 0x02 )
                        {
                            UpdateRegIcon(1);       // Set reg ICON to Registered...
                        }
                        
                    }
                                                            
                    
                    // Look at the registered status to update the cloud.   Must wait until after the nxtyRxRegLockStatus check above
                    // so the logic will update the isRegistered variable.
                    if( isRegistered )
                    {
                        SendCloudData( "'Registered':" + 1 );
                    }
                    else
                    {
                        SendCloudData( "'Registered':" + 0 );
                    }
                
                    // Start a timer to check the UNII status once per second...  
// NO_U                    checkUniiStatusMainTimer = setTimeout(CheckUniiStatusMain, 1000);
                
                } 
            }  // End of else
            


            
          
            uMainLoopCounter++;
            
            if( uMainLoopCounter > MAIN_LOOP_COUNTER_MAX )
            {
                // Clear the loop timer to stop the loop...
                clearInterval(MainLoopIntervalHandle);
                SpinnerStop();
                
                var     eTxt                                     = "Unable to sync data...";
                if( isNxtyStatusCurrent == false )          eTxt = "Unable to get Model Number from Cel-Fi";
                else if( isNxtySnCurrent == false )         eTxt = "Unable to get Serial Number from Cel-Fi";
                else if( nxtySwVerNuCf   == null )          eTxt = "Unable to get NU SW Ver from Cel-Fi";
                else if( nxtySwVerCuCf == null )            eTxt = "Unable to get CU SW Ver from Cel-Fi";
                else if( nxtySwVerCuPic == null )           eTxt = "Unable to get CU PIC SW Ver from Cel-Fi";
                else if( nxtySwVerNuPic == null )           eTxt = "Unable to get NU PIC SW Ver from Cel-Fi";
                else if( nxtySwVerBt == null )              eTxt = "Unable to get BT SW Ver from Cel-Fi";
                else if( bExtAntCheckComplete == false )    eTxt = "Unable to get Ext Ant status from Cel-Fi";
                else if( nxtyUniqueId == null )             eTxt = "Unable to get Unique ID from Cel-Fi";
                
                
                showAlert( eTxt, "Timeout");
                UpdateStatusLine( "Timeout: " + eTxt );
            }

        }   // End if( isBluetoothCnx )

		
	}, // End of MainLoop()



};




// GetSkuFromUniqueId.............................................................................................................
function GetSkuFromUniqueId() 
{ 
//    var wsUri = "ws://echo.websocket.org/";           // Echo server
//    var wsUri = "ws://172.16.10.151:443/";            // Test server
//    var wsUri = "ws://nxt-rdhk:443/";                 // Nextivity server (internal)
    var wsUri = "ws://celfi.nextivityinc.com:443/";     // Nextivity server (external)
    
    PrintLog(1, "WS: GetSkuFromUniqueId()");
     
    websocket = new WebSocket(wsUri); 
    websocket.onopen = function(evt) { onOpen(evt) }; 
    websocket.onclose = function(evt) { onClose(evt) }; 
    websocket.onmessage = function(evt) { onMessage(evt) }; 
    websocket.onerror = function(evt) { onError(evt) }; 
}  

function onOpen(evt) 
{ 
    PrintLog(1, "WS: CONNECTED"); 

    var u8UniqueIdBuff = new Uint8Array(
    [
        0,0,0,0,0,0,0,0,                                            // Unique ID LSB first...

        0x46, 0x32, 0xa5, 0x22, 0xe8, 0xbb, 0x40, 0xae,             // User hash for user "anonymous", LSB first

        0x35, 0xe0, 0xca, 0xb5, 0xc9, 0x1d, 0xe8, 0x70, 0x0d, 0xed, 0x52, 0x20, 0x44, 0x2c, 0xb8, 0x6d, 
        0x81, 0xf4, 0x07, 0xc3, 0x67, 0x8b, 0xd1, 0x8e, 0x40, 0xbf, 0x7b, 0xf1, 0xaf, 0x5a, 0xd5, 0xd4,           // Password hash for user "anonymous", LSB first
         
        0xff, 0xff, 0xff, 0xff,                                     // Version of the client tool, since we don't want updates via this mechanism I make this max
        0xFE                                                        // The magic opcode to request a partnumber
    ]);

    // Unique ID LSB first....
    u8UniqueIdBuff[0] = u8UniqueId[7];
    u8UniqueIdBuff[1] = u8UniqueId[6];
    u8UniqueIdBuff[2] = u8UniqueId[5];
    u8UniqueIdBuff[3] = u8UniqueId[4];
    u8UniqueIdBuff[4] = u8UniqueId[3];
    u8UniqueIdBuff[5] = u8UniqueId[2];
    u8UniqueIdBuff[6] = u8UniqueId[1];
    u8UniqueIdBuff[7] = u8UniqueId[0];

    PrintLog(1, "WS: Sent part number request for UniqueId: " + nxtyUniqueId);
    websocket.send(u8UniqueIdBuff);
}  

function onClose(evt) 
{ 
    PrintLog(1, "WS: DISCONNECTED"); 
}  

function onMessage(evt) 
{ 
    if( evt.data instanceof Blob )
    {
//        PrintLog(1, "WS: Blob RESPONSE stringify: " + JSON.stringify(evt.data) );

        var arrayBuffer;
        var fileReader = new FileReader();
        fileReader.onload = function() 
        {
            arrayBuffer = this.result;
            var u8Rcvd  = new Uint8Array(arrayBuffer);
            
            var outText = u8Rcvd[0].toString(16);
            var sku     = String.fromCharCode(u8Rcvd[0]); 
            for( var i = 1; i < u8Rcvd.length; i++ )
            {
                outText += " " + u8Rcvd[i].toString(16);
                sku     += String.fromCharCode(u8Rcvd[i]);
            }

            PrintLog(1, "WS: u8Rcvd: " + outText + " SKU: " + sku );
            
            SendCloudData( "'SKU_Number':'" + sku + "'" );
        };
        fileReader.readAsArrayBuffer(evt.data);        
        
    }
    else
    {
        PrintLog(1, "WS: Text RESPONSE: " + evt.data );
    } 
    websocket.close(); 
}  

function onError(evt) 
{ 
    PrintLog(1, "WS: ERROR: " + evt.data); 
}  
// End GetSkuFromUniqueId..........................................................................................................





	
