import { Grid, Typography } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import CssBaseline from '@material-ui/core/CssBaseline';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { DataUsage } from '@material-ui/icons';
import { PDFDocument, rgb } from 'pdf-lib';
import queryString from 'query-string';
import React, { useEffect, useReducer, useState } from 'react';
import { useHistory } from 'react-router';
import { instance } from '../../utilities/axios';
import storage from '../../utilities/firebase';

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

export default function Document() {
  let history = useHistory();
  const { id, secret } = queryString.parse(window.location.search);
  const classes = useStyles();
  const [signingDocument, setSigningDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileBytes, setFileBytes] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [formInput, setFormInput] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {}
  );

  useEffect(() => {
    if (id && secret) {
      instance
        .get('/api/v1/documents', {
          params: {
            id,
            secret,
          },
        })
        .then((res) => {
          if (res.data) {
            setSigningDocument(res.data);
            setPdfInfo(res.data.originalDocumentUrl);
          } else {
            alert('Document could be signed !');
          }
        })
        .catch(() => {});
    }
  }, [id, secret]);

  const handleInput = (evt) => {
    let name = evt.target.name;
    const newValue = evt.target.value;
    if (name.indexOf('signer.') === 0) {
      name = name.substring(7);
      setFormInput({
        signer: {
          ...formInput.signer,
          [name]: newValue,
        },
      });
    } else setFormInput({ [name]: newValue });
  };

  const handleSumbit = (e) => {
    setLoading(true);
    e.preventDefault();
    if (signingDocument) {
      instance
        .post('/api/v1/documents/sign', {
          ...signingDocument,
          signedDocumentUrl: signingDocument.originalDocumentUrl,
        })
        .then(() => {
          alert('Sign success');
          history.replace('/document');
        })
        .catch(() => {
          alert('Sign error');
          setLoading(false);
        });
    } else {
      instance
        .post('/api/v1/documents', formInput)
        .then(() => {
          alert('Request success');
          setLoading(false);
        })
        .catch(() => {
          alert('Make request error');
          setLoading(false);
        });
    }
  };

  const modifyPdf = async () => {
    if (fileBytes) {
      console.log('heehheeh');
      const pdfDoc = await PDFDocument.load(fileBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Get the width and height of the first page
      const svgPath =
        'M 0,20 L 100,160 Q 130,200 150,120 C 190,-40 200,200 300,150 L 400,90';
      firstPage.moveTo(100, firstPage.getHeight() - 5);

      // Draw the SVG path as a black line
      firstPage.moveDown(25);
      firstPage.drawSvgPath(svgPath);

      // Draw the SVG path as a thick green line
      firstPage.moveDown(200);
      firstPage.drawSvgPath(svgPath, {
        borderColor: rgb(0, 1, 0),
        borderWidth: 5,
      });

      // Draw the SVG path and fill it with red
      firstPage.moveDown(200);
      firstPage.drawSvgPath(svgPath, { color: rgb(1, 0, 0) });

      // Draw the SVG path at 50% of its original size
      firstPage.moveDown(200);
      firstPage.drawSvgPath(svgPath, { scale: 0.5 });

      const pdfBytes = await pdfDoc.save();
      const docUrl = URL.createObjectURL(
        new Blob(pdfBytes, { type: 'application/pdf' })
      );
      setPdfInfo(docUrl);
      window.open(docUrl);
    }
  };

  const handleChange = async (e) => {
    try {
      let reader = new FileReader();
      let file = e.target.files[0];
      reader.readAsArrayBuffer(file);
      reader.onload = async () => {
        var bytes = new Uint8Array(reader.result); // read the actual file contents
        setFileBytes(bytes);
        var blob = new Blob([bytes], { type: 'application/pdf' });
        const docUrl = URL.createObjectURL(blob);
        console.log(docUrl);
        setPdfInfo(docUrl);
        // modifyPdf();
      };
      storage
        .ref(`/pdf/${file.name}`)
        .put(file)
        .on('state_changed', async (res) => {
          const downloadUrl = await res.ref.getDownloadURL();
          setFormInput({
            originalDocumentUrl: downloadUrl,
            tagSignatureLocations: ['12.3333,30.222222'],
          });
        });
    } catch (error) {}
  };

  return (
    <Container component="main" maxWidth="lg">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <DataUsage />
        </Avatar>
        <Grid container spacing={5}>
          {!signingDocument && (
            <Grid item lg={4}>
              <form onSubmit={handleSumbit} className={classes.form} noValidate>
                <Typography variant="h6">Document</Typography>
                <input type="file" accept=".pdf" onChange={handleChange} />
                <Typography variant="h6">Signer Details</Typography>
                <TextField
                  onChange={handleInput}
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="signer.email"
                  autoComplete="email"
                  autoFocus
                />
                <TextField
                  onChange={handleInput}
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  id="firstname"
                  label="Firstname"
                  name="signer.firstname"
                  autoComplete="firstname"
                  autoFocus
                />
                <TextField
                  onChange={handleInput}
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  id="lastname"
                  label="Lastname"
                  name="signer.lastname"
                  autoComplete="lastname"
                  autoFocus
                />
                <TextField
                  onChange={handleInput}
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  id="phoneNumber"
                  label="Phone Number"
                  name="signer.phoneNumber"
                  autoComplete="phoneNumber"
                  autoFocus
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                  disabled={loading}
                >
                  Make signing document request
                </Button>
              </form>
            </Grid>
          )}
          {signingDocument && (
            <Grid item lg={4}>
              <form onSubmit={handleSumbit} className={classes.form} noValidate>
                <Typography variant="h6">Requestor Details</Typography>
                <Grid container justify="space-between">
                  <Grid item lg={12}>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      disabled
                      label={'Fullname'}
                      value={`${signingDocument.user.firstname} ${signingDocument.user.lastname}`}
                      fullWidth
                    />
                  </Grid>
                  <Grid item lg={12}>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      disabled
                      label={'Email'}
                      value={signingDocument.user.email}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Typography variant="h6">Signer Details</Typography>
                <Grid container justify="space-between">
                  <Grid item lg={12}>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      disabled
                      label={'Fullname'}
                      value={`${signingDocument.signer.firstname} ${signingDocument.signer.lastname}`}
                      fullWidth
                    />
                  </Grid>
                  <Grid item lg={12}>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      disabled
                      label={'Email'}
                      value={signingDocument.signer.email}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                  disabled={loading}
                >
                  Sign
                </Button>
              </form>
            </Grid>
          )}
          <Grid item lg={8}>
            <iframe
              height={'520px'}
              width={'100%'}
              title="test-frame"
              src={pdfInfo}
              type="application/pdf"
            />
          </Grid>
        </Grid>
      </div>
    </Container>
  );
}
