import { makeStyles } from '@mui/styles';

const useHomeStyles = makeStyles((theme) => ({
    container: {
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: '#f5f6f6',
    },
    
    mainDiv: {
        display: 'flex',
        width: '100%',
        height: '100%', // Crucial - inherits from container

    },
    // Update the leftDiv style:
    leftDiv: {
        width: '14.375%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative', // Add this
    },

    customScrollbar: {
        position: 'absolute',
        top: '15.5%', // adjust based on design
        right: '0.5%', // relative to the table container
        width: '0.9896vw', // 19px on 1920px screen
        height: '78.5214%', // 679px on 911px height
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    
    scrollArrow: {
        fontSize: '0.4333vw', // ~16px
        color: '#333',
        cursor: 'pointer',
        userSelect: 'none',
    },
    
    scrollTrack: {
        flex: 1,
        width: '0.2604vw', // 5px
        backgroundColor: '#FFFFFF',
        borderRadius: '2.5px',
        marginTop: '5px',
        marginBottom: '5px',
        position: 'relative',
    },
    
    scrollThumb: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '10%',
        backgroundColor: '#D9D9D9',
        borderRadius: '2.5px',
        cursor: 'pointer',
        transition: 'top 0.1s',
        zIndex: 1,
    },
    
    
    
    
    logoBox: {
        height: '10.9769%', // 99/911 (keep existing)
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingLeft: '22.4638%', // 62/276 = 22.4638% (matches your request)
        boxSizing: 'border-box',
        flexShrink: 0, // Prevent shrinking
    },

    ptpLogo: {
        width: '55.0725%', // 152/276 = 55.0725%
        height: '109.03%', // 109.03/100 = 109.03%
        // Note: Height exceeds container, you may want to adjust this
        objectFit: 'contain', // This will maintain aspect ratio
        marginLeft: '9%',
    },

    LeftPanelBox: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '5.2632vh', // 48px (was 5.6804% which was ~48px but calculation was off)
        minHeight: '2.5vw', // fallback
        
        padding: '12px 0 12px 18.8406%', // Add vertical padding (12px top/bottom)
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
            backgroundColor: '#6A84FC1F',
            
        },
    },
   
    LogoutSection: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '5.0794vh', // Match other options (48px)
        minHeight: '5.26vh', // fallback
        padding: '12px 0 12px 18.8406%', // Match other options
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
            backgroundColor: '#6A84FC1F',
            '& $logoutText': {
                color: '#012498',
                fontWeight: 600,
            },
        },
    },    
    

    logoutText: {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.8333vw', // Match other options (14/1440)
        fontWeight: 400,
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#333333',
        marginLeft: '5.7971%', // 16/276 = 5.7971% (match other options)
        whiteSpace: 'nowrap',
        transition: 'all 0.3s ease',
    },

    leftPanelBelowLogo: {
        height: '88.9133%', // 810/911 = 88.9133%
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: '2.7160%', // Add 15px top padding (15/810)


    },
    leftPanelRole: {
        backgroundColor: '#fff',
        padding: '10px',
    },

    

    LeftPanelRolesImg: {
        width: '100%',
        maxWidth: '45px',
        height: 'auto',
        boxSizing: 'border-box',
        
        paddingBottom: '15px'
    },
    LeftPanelImg: {
        width: '8.6957%', // 24/276 = 8.6957%
        maxWidth: '24px',
        height: '8.6957%',
        maxHeight: '24px',
        marginRight: '5.7971%', // 16/276 = 5.7971%
    },
    leftPanelContent: {
        height: '89.53%', // (945-99)/945 = ~89.53%
        width: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },

    leftPanelOptions: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        gap: '1.2698%', // 12px / 945
        marginTop: '0', // Remove default top margin here
    },

    firstMenuItem: {
        marginTop: '3.9%', // 22px / 911 = 2.414%
    },

    analyticsContainer: {
        position: 'absolute',
        width: '66.25%',       // 855/1440 = 59.375%
        height: '52.9088%',      // 344/945 = 36.402%
        top: '12.6783%',         // 115/945 = 12.169%
        left: '15.1562%',        // 297/1440 = 20.625%
        backgroundColor: '#FFFFFF',
        borderRadius: '22.2px',
        padding: '1.5%',
        boxSizing: 'border-box',
        zIndex: 1,
        '& $headerTitleDashboard': {
            position: 'relative',
            top: '0',      // 18/344
            left: '1%',      // 30/855
            height: '3.1833%', 
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            fontSize: '1.25vw',
            lineHeight: '100%',
            letterSpacing: '0%',
            color: '#0E1E53',
            margin: 0,
        }
    },

    

    // Update the TableHead styles in your useHomeStyles.js
    tableHeadCell: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 500,
        fontSize: '0.9722vw', // 14/1440 = 0.9722vw
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        padding: '0.6944vw', // 10/1440 = 0.6944vw (vertical padding)
        paddingLeft: '0', // No left padding
        paddingRight: '1.3889vw', // 20/1440 = 1.3889vw (right padding)
        whiteSpace: 'nowrap',
            borderBottom: '0.1389vw solid #E0E0E0', // 2/1440 = 0.1389vw
        textAlign: 'left',
        position: 'relative',
        '&:first-child': {
            paddingLeft: '2.0833vw', // 30/1440 = 2.0833vw (first cell left padding)
        },
    },

    tableContainer: {
        position: 'absolute',
        top: '14.6789%', // 64/436 = 14.6789% from top of call logs box
        left: '3.5088%',     // 30/855 = 3.5088% from left of call logs box
        width: '93.3333%', // (855-60)/855 = 93.3333% (60px padding on both sides)
        backgroundColor: '#FFFFFF',
        overflowX: 'auto',
        height: 'calc(100% - 80px)', // Adjust height to account for header
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 500,
        fontSize: '0.9722vw', // 20/1440
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        margin: 0,
    },

    scrollableTable: {
        height: '100%',
        maxHeight: '100%',
        overflowY: 'auto', // ✅ Enable vertical scrolling
        overflowX: 'hidden', // ❌ Disable side scroll unless needed
        paddingRight: '10px', // Optional: spacing for custom scrollbar
      
        // Custom Scrollbar (optional)
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#ccc',
          borderRadius: '4px',
        },
      },
      
      

    datePickerFloating: {
        position: 'absolute',
        top: '20.58%',     // 187.5px of 911
        left: '88.07%',    // 1690.86px of 1920
        zIndex: 5,
        transform: 'translateX(-100%)', // Optional: align right edge with left anchor
    },
    

    callLogsTableContainer: {
        backgroundColor: '#f6f7f7',
        width: '100%',
        maxHeight: 'calc(100vh - 400px)', // Adjust based on your needs
        overflow: 'auto',
        borderRadius: '8px',
        boxShadow: 'none', // Remove shadow since container has it
    },
    
    // Add this to your useHomeStyles.js
    callLogsBackgroundContainer: {
        position: 'absolute',
        width: '84.0625%',       // 1614/1920 = 84.0625%
        height: '63.7761%',      // 581/911 = 63.7761%
        top: '33.6443%',         // 306.5/911 = 33.6443%
        left: '15.1396%',        // 290.68/1920 = 15.1396%
        backgroundColor: '#FFFFFF',
        borderRadius: '15px',
        boxSizing: 'border-box',
        zIndex: 0,
        overflow: 'hidden',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', // Optional: adds depth
    },

    // Update the TableContainer styles to ensure proper positioning
    callLogsContainer: {
        position: 'absolute',
        width: '65.8854%',       // 1265/1920 = 65.8854%
        height: '29.9670%',      // 273/911 = 29.9670%
        top: '67.8375%',         // Position from top of screen
        left: '15.5208%',        // Position from left of screen
        backgroundColor: '#FFFFFF',
        borderRadius: '15px',
        padding: '1.5%',
        boxSizing: 'border-box',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden', // ✅ ADD THIS
        overflowY: 'hidden', // ✅ ADD THIS
    },
    
    

    
    LeftPanelText: {
        fontFamily: 'Montserrat',
        fontSize: '0.8333vw', // Fixed pixel value
        fontWeight: 400,
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#333333',
        margin: 0,
        whiteSpace: 'nowrap',
    },
    arrowIcon: {
        marginLeft: 'auto',
        color: 'gray',
        fontSize: '1.2vw',
        marginRight: '18.8406%', // Match left padding
    },

    // Add these styles to your useHomeStyles.js
    selectDateContainer: {
        position: 'absolute',
        top: '45.42%',      // 184.41px / 406px = 0.4542 (45.42%)
        left: '19.6%',      // 136px / 694px = 0.196 (19.6%)
        width: '29.39%',    // 204px / 694px = 0.2939 (29.39%)
        height: '9.11%',    // 37px / 406px = 0.0911 (9.11%)
    },
    
    selectDateInput: {
        width: '100%',
        height: '100%',
        borderRadius: '25px',
        border: '1px solid #DCDCDC',
        padding: '11px 12px 11px 24px', // Top 11px, Right 12px, Bottom 11px, Left 24px
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '16px',
        color: '#747474',
        backgroundColor: '#FFFFFF',
        '&:focus': {
        outline: 'none',
        borderColor: '#172F82',
        },
    },
    
    selectDateLabel: {
        position: 'absolute',
        top: '-10.2%',      // 175.46px / 406px = 0.4322 (43.22%)
        left: '9.25%',     // 160px / 694px = 0.2305 (23.05%)
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '10px',
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#747474',
        backgroundColor: '#FFFFFF',
        padding: '0 4px',
        zIndex: 1,
    },

    // Add these styles to your useHomeStyles.js
    selectTimeContainer: {
        position: 'absolute',
        top: '45.42%',      // Same as selectDate (184.41px / 406px = 0.4542)
        left: '53.75%',     // 373px / 694px = 0.5375 (53.75%)
        width: '29.39%',    // Same as selectDate (204px / 694px)
        height: '9.11%',    // Same as selectDate (37px / 406px)
    },
    
    selectTimeInput: {
        width: '100%',
        height: '100%',
        borderRadius: '25px',
        border: '1px solid #DCDCDC',
        padding: '11px 12px 11px 24px', // Same padding as selectDate
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '16px',
        color: '#747474',
        backgroundColor: '#FFFFFF',
        '&:focus': {
        outline: 'none',
        borderColor: '#172F82',
        },
    },
    
    selectTimeLabel: {
        position: 'absolute',
        top: '-10.2%',      // Same as selectDate
        left: '9.25%',      // (397px - 373px) / 204px = 0.1176 (11.76%)
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '10px',
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#747474',
        backgroundColor: '#FFFFFF',
        padding: '0 4px',
        zIndex: 1,
    },

    timeZoneContainer: {
        position: 'absolute',
        top: '59.36%',      // 241px / 406px = 0.5936 (59.36%)
        left: '19.6%',      // 136px / 694px = 0.196 (19.6%)
        width: '63.54%',    // 441px / 694px = 0.6354 (63.54%)
        height: '8.9%',     // 28px / 406px = 0.06896 (6.9%)
        backgroundColor: '#F5F5F5',
        borderRadius: '4px',
        border: '1px solid #F5F5F5',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
    },
    
    timeZoneSelect: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        border: 'none',
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '16px',
        color: '#747474',
        outline: 'none',
        cursor: 'pointer',
    },
    
    timeZoneLabel: {
        display: 'none', // Hide the label since it's not shown in the design
    },



       // Add this to your Dialog styles in useSendCallsStyles.js
    scheduleLabelContainer: {
        position: 'absolute',
        top: '32.63%',      // 132.48px / 406px = 0.3263 (32.63%)
        left: '19.6%',      // 136px / 694px = 0.19596 (19.6%)
        width: '63.54%',    // 441px / 694px = 0.6354 (63.54%)
        height: '6.9%',     // 28px / 406px = 0.06896 (6.9%)
        backgroundColor: '#F5F5F5',
        borderRadius: '4px',
        border: '1px solid #F5F5F5',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
    },

    scheduleLabelText: {
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '16px',
        color: '#747474',
    },
    scheduleLabelInput: {
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '16px',
        color: '#747474',
        
      },
      

    

    rightDiv: {
        width: '80%',
        backgroundColor: '#f6f7f7',
        overflowY: 'scroll',     // ✅ force scrolling always available
        overflowX: 'hidden',     // ❌ no side scroll
        padding: '2% 5%',
    
        /* Add these 3 lines to HIDE the scrollbar */
        scrollbarWidth: 'none',  // For Firefox
        msOverflowStyle: 'none', // For Internet Explorer and Edge
        '&::-webkit-scrollbar': {
          display: 'none',       // For Chrome, Safari, Opera
        },
    },
    
    HeaderBox: {
        width: '100%',
        // paddingTop: '40px',
        paddingBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between'
    },

    

    

    headerContainer: {
        position: 'fixed', // Changed from absolute to fixed
        left: '14.375%',
        top: 0,
        width: '85.625%',
        height: '10.8672%', // Must match logoBox
        backgroundColor: '#FFFFFF',
        zIndex: 1,

    },

    welcomeText: {
        position: 'absolute',
        top: '35%', // Keep this relative to the headerContainer height
        left: '3.125vw', // ~51/1644 = 3.1022% (maintains similar padding from left edge)
        fontFamily: '"Montserrat Alternates", sans-serif',
        fontWeight: 700,
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        height: '100%',
        margin: 0,
        whiteSpace: 'nowrap',          // Keep text in one line
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    analyticsInnerBox: {
        position: 'absolute',
        width: '93.2835%',     // 798/855
        height: '77.8381%',    // 260/344
        top: '14.7593%',       // 59/344
        left: '3.4020%',       // 29/855
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },

    analyticsBoxRow: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        height: '46.1538%', // 120/260
    },


    // In your useHomeStyles.js, update the analyticsBox styles:
    analyticsBox: {
        width: '31.3283%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '7px',
        border: '1px solid #E0E0E0',
        padding: '2%',
        boxSizing: 'border-box',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
            transform: 'scale(1.03)',
        },
        '&::after': {
            content: '"Today"',
            position: 'absolute',
            top: '7.2vh',           // Approx. 37.1685% of 1440px (screen height)
            left: '2.3vw',            // 30px / 250px = 12%
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: 400,
            fontSize: '0.83vw',      // Equivalent to 16px on 1920px width
            lineHeight: '100%',
            letterSpacing: '0%',
            color: '#979797',
        },
        // Add this for the icon container
        '& $analyticsBoxIcon': {
            position: 'absolute',
            width: '9.6%',      // 24/250 = 9.6%
            height: '20%',      // 24/120 = 20%
            top: '16.6667%',     // 20/120 = 16.6667% (matches title position)
            left: '75.2%',       // 188/250 = 75.2%
        }
    },

    statusInProgress: {
        width: '116px',
        height: '26px',
        borderRadius: '3px',
        border: '1px solid #00C023',
        backgroundColor: '#63FA114D',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '12px',
        lineHeight: '18px',
        letterSpacing: '0%',
        color: '#000000',
        whiteSpace: 'nowrap',
        margin: 'auto',
    },
    
    statusQueued: {
        width: '116px',
        height: '26px',
        borderRadius: '3px',
        border: '1px solid #FDCD2D',
        backgroundColor: '#FDCD2D4D',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '12px',
        lineHeight: '18px',
        letterSpacing: '0%',
        color: '#000000',
        whiteSpace: 'nowrap',
        margin: 'auto',
    },
    

    // Add this new style for the icon
    analyticsBoxIcon: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },

    // Update all box styles with these background properties
    totalCallsBox: {
        //backgroundImage: `url(${require('../Images/TotalCalls.png')})`,
        backgroundSize: 'cover', // Changed from fixed size to cover
        backgroundPosition: 'center', // Center the image
        backgroundRepeat: 'no-repeat',
    },
    answeredBox: {
        //backgroundImage: `url(${require('../Images/Answered.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    voicemailBox: {
        //backgroundImage: `url(${require('../Images/Voicemail.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    unknownBox: {
        //backgroundImage: `url(${require('../Images/Unknown.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    transferredBox: {
        //backgroundImage: `url(${require('../Images/Transfered.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    avgCallDurationBox: {
        //backgroundImage: `url(${require('../Images/CallDuration.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },

    // Make sure text appears above the background with good contrast
    analyticsBoxTitle: {
        fontFamily: '"Montserrat", sans-serif', // Use the same format as welcomeText
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        position: 'absolute',
        top: '16.6676%', // 20/120 = 16.6667%
        left: '12%', // 30/250 = 12%
        zIndex: 1,
        margin: 0, // Remove default margins
    },
    analyticsBoxValue: {
        fontFamily: '"Montserrat", sans-serif', // Use the same format as welcomeText
        fontWeight: 800,
        fontSize: '2.2916%vw', // Adjust as needed (25px would be 10%)
        color: '#002294',
        position: 'absolute',
        top: '68.75%', // Center vertically
        left: '12%', // Match title alignment
        transform: 'translateY(-50%)',
        zIndex: 1,
        width: '76%', // 190/250 = 76% (remaining space after left position)
        textAlign: 'left',
    },

    headerContent: {
        position: 'relative',
        top: '35%', // 35/100
        left: '4.3814%', // 51/1164
        height: '29%', // 29/100
    },

    headerTitle: {
        fontSize: '1.6667vw', // ~24px at 1440px
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 0.5291% 0', // ~5px at 945px
    },
    headerTitleDashboard: {
        position: 'absolute',
        top: '8.5714%',          // 28/273 = 10.2564% from top of call logs box
        left: '3.5088%',         // 30/855 = 3.5088% from left of call logs box
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700,
        fontSize: '1.25%vw',    // 20/1920 = 1.0417vw
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#0E1E53',
        margin: 0,
        zIndex: 1,

    },

    callLogsTitles: {
        position: 'absolute',
        top: '23.2601%',         // 63.5/273 = 23.2601% from top of call logs box
        width: '93.3333%',       // (1265-90)/1265 = 93.3333% (90px padding on sides)
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 3.5088%',    // 30/855 = 3.5088% padding
        boxSizing: 'border-box',
    },
    

    // Inside your useHomeStyles
    toDataCell: {
        width: '16.667%',
        marginLeft: '-1.2%',  // perfectly aligned left like image
        justifyContent: 'flex-start',
        textAlign: 'left',
        boxSizing: 'border-box',
    },
    
    callLogsCellFrom: {
        width: '16.667vw',
        transform: 'translateX(-10vw)', // ✅ Use this instead of marginLeft
        justifyContent: 'flex-start',
        textAlign: 'left',
        boxSizing: 'border-box',
    },
    
    
    
    callLogsCellFirstName: {
        width: '16.667%',
        marginLeft: '-1.2%', // align with "From"
        justifyContent: 'flex-start',
        textAlign: 'left',
        boxSizing: 'border-box',
    },
    
    callLogsCellSummary: {
        width: '16.667%',
        marginLeft: '-1.2%', // keep aligned with other text data
        justifyContent: 'flex-start',
        textAlign: 'left',
        position: 'relative',
        boxSizing: 'border-box',
    },
    
    
    

    // Add these to your useHomeStyles
    callLogsCellTo: {
        width: '16.667%',
        paddingLeft: '2%', // Adjust this value as needed
        justifyContent: 'flex-start',
        textAlign: 'left',
    },
    
    
    callLogsCellCallLength: {
        width: '16.667%',
        justifyContent: 'center',
        textAlign: 'center',
    },

    callLogsCell: {
        flex: '1 1 16.667vw', // Responsive width: ~1/6 of 100vw
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '0.729vw',         // ≈ 14px on 1920px screen
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        height: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '0.417vw 0.625vw',  // ≈ 8px 12px
        boxSizing: 'border-box',
        minWidth: 0,                 // Important for text truncation
    },
    

    // Specific column styles
    callDirectionCell: {
        justifyContent: 'flex-start',       // Align content to the start
        textAlign: 'left',                  // Text aligned left
        flex: `0 0 16.667vw`,               // 1/6th of 100vw = responsive width
        paddingLeft: '0.625vw',             // Equivalent to ~12px at 1920px
        marginRight: 'auto',                // Push content left
    },
    

    toCell: {
        justifyContent: 'flex-start',
        textAlign: 'left',
        marginLeft: '-8.5vw',        // Responsive left shift
        flex: `0 0 16.667vw`,               // 1/6th of 100vw = responsive width
        fontVariantNumeric: 'tabular-nums'
    },
    
    

    fromCell: {
        justifyContent: 'flex-start',
        flex: `0 0 16.667vw`,               // 1/6th of 100vw = responsive width
        textAlign: 'left',
        marginLeft: '-6.5vw',      // Match `toCell`
        fontVariantNumeric: 'tabular-nums'
    },
    

    firstNameCell: {
        justifyContent: 'flex-start',
        flex: `0 0 16.667vw`,               // 1/6th of 100vw = responsive width
        textAlign: 'left',
        marginLeft: '-6.3vw',     // Match left offset of toCell
    },
    

    summaryCell: {
        justifyContent: 'flex-start',
        textAlign: 'left',
        flex: `0 0 16.667vw`,               // 1/6th of 100vw = responsive width
        marginLeft: '-6.5vw',        // Small left padding, scales with screen
        overflow: 'visible',       // Allow overflow for summary popup
    },
    

    // Add these styles to your existing styles
    summaryPopup: {
        position: 'absolute',
        top: '30px',
        left: 0,
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '1rem',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        width: '300px',
        maxWidth: '300px', // Ensure it doesn't exceed this width
        wordWrap: 'break-word', // Allow long words to break
        whiteSpace: 'pre-wrap', // Preserve line breaks and wrap text
    },

    callLengthCell: {
        justifyContent: 'flex-start',        // Align content to the start
        textAlign: 'left',                   // Text aligned left
        flex: '0 0 16.667vw',                // Fixed responsive width
        paddingLeft: '0vw',                  // Remove left padding to shift fully left
        marginRight: 'auto',                 // Keeps it aligned left
        transform: 'translateX(-4.7vw)',       // 👈 Nudge entire cell 1vw to the left
    },
    
    
    center: {
        justifyContent: 'center',
        textAlign: 'center',
    },
    
    left: {
        justifyContent: 'flex-start',
        textAlign: 'left',
    },
    
    
    
    

    callLogsContent: {
        position: 'absolute',
        top: '30.0366%',         // 82/273 = ~30.0366% (titles at 63.5px + some spacing)
        width: '93.3333%',       // Match titles width
        height: 'calc(100% - 9.0vh)',
        overflowY: 'auto',
        overflowX: 'hidden', // ✅ ADD THIS
        padding: '0 3.5088%',    // Match titles padding
        boxSizing: 'border-box',
    },

    callLogsRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        minHeight: '3.2936%',    // 30/911 = 3.2936%
        cursor: 'pointer',
        borderBottom: '1px solid #f0f0f0',
        padding: '0',
        boxSizing: 'border-box',
        '&:last-child': {
            borderBottom: 'none',
        },
        '&:hover': {
            backgroundColor: '#f9f9f9',
        },
    },

    callLogsTitle: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 500,
        fontSize: '0.7292vw', // 14px on 1920px width
        lineHeight: '100%',
        letterSpacing: '0.026vw', // ~0.5px at 1920px width
        color: '#000000',
        whiteSpace: 'nowrap',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'left',
    
        '&:first-child': {
            flex: '0.8',
            justifyContent: 'center', // Center Call Direction title
            textAlign: 'center',
        },
    
        '&:nth-child(6)': {
            justifyContent: 'center', // Center Call Length title
            textAlign: 'center',
        },
    
        '&:not(:first-child):not(:nth-child(6))': {
            justifyContent: 'flex-start',
        },
    },
    
    

    callDirectionIcon: {
        width: '1.25vw',         // ~24px at 1920px
        height: '1.25vw',
    },
    
    summaryButton: {
        cursor: 'pointer',
        color: '#007BFF',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '0.7292vw',    // 14/1920 = 0.7292vw
        fontFamily: 'Montserrat, sans-serif',
        padding: 0,
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    
    loadingContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    },
    
    errorText: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'red',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.8333vw',    // 16/1920 = 0.8333vw
    },
    
    noCallsText: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.8333vw',    // 16/1920 = 0.8333vw
        color: '#666',
    },


    headerSubtitle: {
        fontFamily: '"Montserrat Alternates", sans-serif',
        fontWeight: 400,
        fontSize: '0.8333vw',
        lineHeight: '100%',
        color: '#333333',
        margin: 0,
        marginTop: '0.5vh',
    },

    // Add this style to your useHomeStyles.js
    contentContainer: {
        position: 'absolute',
        width: '84.0104%',       // 1623/1920 = 84.5313%
        height: '85.1811%',      // 776/911 = 85.1811%
        top: '12.6783%',         // 115.5/911 = 12.6783%
        left: '15.1641%',        // 291.15/1920 = 15.1641%
        backgroundColor: '#FFFFFF',
        borderRadius: '22.2px',
        padding: '1.5%',         // Optional padding inside the container
        boxSizing: 'border-box',
        zIndex: 0,               // Behind other content
        overflow: 'hidden',      // Prevent content from overflowing rounded corners
    },

    statusHuman: {
        width: '103px',
        height: '26px',
        borderRadius: '3px',
        border: '1px solid #00C023',
        backgroundColor: '#63FA114D',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '12px',
        lineHeight: '18px',
        letterSpacing: '0%',
        color: '#000000',
        whiteSpace: 'nowrap',
        margin: 'auto',
    },
    
    statusVoicemail: {
        width: '103px',
        height: '26px',
        borderRadius: '3px',
        border: '1px solid #FDCD2D',
        backgroundColor: '#FDCD2D4D',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '12px',
        lineHeight: '18px',
        letterSpacing: '0%',
        color: '#000000',
        whiteSpace: 'nowrap',
        margin: 'auto',
    },
    
    statusUnknown: {
        width: '103px',
        height: '26px',
        borderRadius: '3px',
        border: '1px solid #C0C0C0',
        backgroundColor: 'rgba(192, 192, 192, 0.3)', // 30% opacity
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '12px',
        lineHeight: '18px',
        letterSpacing: '0%',
        color: '#000000',
        whiteSpace: 'nowrap',
        margin: 'auto',
    },

    HeaderBoxSearch: {
        width: '100%',
        maxWidth: '700px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    headerSearch: {
        width: '500px',
        backgroundColor: '#f6f7f7',
    },
    notificationLogo: {
        width: '100%',
        maxWidth: '50px',
        height: 'auto',
        paddingRight: '15px'
    },
    HeaderBoxProfAndNoti: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        maxWidth: '300px',
    },
    MainBox: {
        display: 'flex',
        flexDirection: 'column', // Stack the boxes vertically
        gap: '24px', // Add space between the rows (use pixels)
    },
    inputContainer: {
        display: 'flex',
        alignItems: 'center', // Align inputs properly
        width: '100%', // Ensure full width for metadata input rows
        gap: '5%',
    },
    
    inputContainerMetadata: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: '10px',
        flexGrow: 1, // Allow it to take full available width
    },

    tableHeadCell: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 500,
        fontSize: '14px', // Changed from vw to fixed px as requested
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        padding: '12px',
        whiteSpace: 'nowrap',
        textAlign: 'center', // Ensure even spacing
        borderBottom: '1px solid #E0E0E0',
    },
    

    tableBodyCell: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#000000',
        textAlign: 'center',
    },

    
    label: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
        fontSize: '16px',
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#333',
        width: '326.78px',           // ⬅️ Force fixed width for all labels
        display: 'inline-block',
        textAlign: 'left',
    },
    
    labelMetadata: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
        fontSize: '16px',
        lineHeight: '100%',
        letterSpacing: '0%',
        color: '#333',
        width: '326.78px',
        display: 'inline-block',
        textAlign: 'left',
    },
    
    input: {
        flex: 1,
        padding: '10px', // Increase padding for better visibility
        border: '1px solid #ccc',
        borderRadius: '10px',
        color: 'gray',
        width: '100%', 
        maxWidth: '500px', // Increased width for better visibility
        fontSize: '16px', // Slightly larger font
    },
    
    inputMetadata: {
        width: '674px',
        height: '32px',
        padding: '4px 8px',
        border: '1px solid #fff',
        borderRadius: '4px',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '10px',
        letterSpacing: '0%',
        color: '#4D4D4D',
        boxSizing: 'border-box',
        marginBottom: '4px',
    },
    dropdownInput: {
        width: '100%',
        height: '32px',
        padding: '4px 8px',
        border: '1px solid #fff',
        borderRadius: '4px',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '20px',
        letterSpacing: '0%',
        color: '#4D4D4D',
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
        marginBottom: '4px',
        appearance: 'none', // removes default dropdown arrow (optional, works best if you use a custom icon)
        WebkitAppearance: 'none',
        MozAppearance: 'none',
    },   
    
    dropdownContainer: {
        position: 'relative',
        width: '100%',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          right: '12px',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #333',
          pointerEvents: 'none',
        }
    },

    metadataRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px', // ✅ Set exact 4px gap between Key, Label, Value
        marginBottom: '8px', // Optional spacing between rows
        marginLeft: '25px', // ✅ Move whole row to the right by 10px (adjust as needed)

    },
    

    metadataInput: {
        width: '190px',                        // ✅ Fixed width as requested
        height: '32px',                        // ✅ Match height of other inputs
        padding: '4px 8px',                    // ✅ Same padding
        border: '1px solid #fff',              // ✅ Consistent border
        borderRadius: '4px',                   // ✅ Match border radius
        fontFamily: 'Montserrat, sans-serif',  // ✅ Match font
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '20px',
        letterSpacing: '0%',
        color: '#4D4D4D',
        boxSizing: 'border-box',
        marginBottom: '4px',                   // ✅ Keep spacing
    },


    
    
    

    voicemailTextarea: {
        width: '674px',
        minHeight: '100px',
        padding: '10px',
        border: '1px solid #fff',
        borderRadius: '10px',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        lineHeight: '1.6', // ✅ Improves vertical spacing
        letterSpacing: '0%',
        color: '#4D4D4D',
        resize: 'vertical',
        boxSizing: 'border-box',
        marginBottom: '4px',
    },
    
    
    
    settingsSubMenu: {
        display: 'flex',
        flexDirection: 'column',
        marginLeft: '18.8406%', // Match left padding
        width: '81.1594%', // 100% - 18.8406%
    },
    
    settingsSubOption: {
        display: 'flex',
        alignItems: 'center',
        height: '48px',
        width: '100%',
        paddingLeft: '18.8406%', // Match left padding
        boxSizing: 'border-box',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.8333vw', // 12/1440
        fontWeight: 400,
        color: '#333333',
        transition: 'all 0.3s ease',
        '&:hover': {
            backgroundColor: '#6A84FC1F',
            color: '#012498',
            fontWeight: 600,
        },
    },

    selectedSubOption: {
        backgroundColor: '#6A84FC1F',
        color: '#012498',
        fontWeight: 600,
    },
    
    fileInput: {
        width: '100%', // Ensure file input is full width
        padding: '8px',
        border: 'none',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    selectedBox: {
        backgroundColor: '#6A84FC1F',
        '& $LeftPanelText': {
            color: '#012498',
            fontWeight: 600,
        },
        '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            width: '2.8986%', // 8/276
            height: '100%',
            backgroundColor: '#2D5DFD',
            borderTopRightRadius: '4px',
            borderBottomRightRadius: '4px',
        },
    },



    LeftPanelImgContainer: {
        width: '10.1449%', // 28px of 276px
        height: '3.0747%', // 28px of 911px
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '5.7971%', // 16/276 = 5.7971%
        '& img': {
            width: '1.25vw', // Changed from 16px to 24px since we're removing the container border
            height: '1.25vw',
        }
    },

    sendCallsBtn: {
        backgroundColor: '#684ccc',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        borderRadius: '25px',
        border: 'none', /* Optional: Remove border */
        padding: '10px 40px',
        marginBottom: '2%',
        marginLeft: '11%',
    },
    fileInputContainer: {
        display: 'flex', // Enable flexbox
        alignItems: 'center', // Center items vertically
        marginLeft: '10px', // Space between label and file input text/button
    },
    fileInputText: {
        marginRight: '10px', // Space between the text and button
    },
    uploadFilesBtn: {
        backgroundColor: '#684ccc',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        borderRadius: '25px',
        border: 'none', // Optional: Remove border
        padding: '10px 20px',
        whiteSpace: 'nowrap', // Prevent text wrapping
        minWidth: '120px', // Optional: Set a minimum width to ensure it looks good
    },
    searchInput: {
        padding: '8px',
        borderRadius: '4px',
        border: 'none',
        width: '300px', // Set a width for the search box
        backgroundColor: '#f6f7f7',
        // paddingLeft: '10px',
        marginRight: '15px',
        color: 'gray'
        // You can add more styles as needed
    },
    searchImg: {
        width: '24px',
        height: '24px',
        borderRadius: '4px',
        padding: '4px',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '-2%',
    },
    
}));

export default useHomeStyles;