import { Grid, Typography } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import CssBaseline from '@material-ui/core/CssBaseline';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { DataUsage } from '@material-ui/icons';
import WebViewer from '@pdftron/webviewer';
import queryString from 'query-string';
import React, { useEffect, useReducer, useRef, useState } from 'react';
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

export default function DocumentPage() {
  let history = useHistory();
  const { id, secret } = queryString.parse(window.location.search);
  const classes = useStyles();
  const [signingDocument, setSigningDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formInput, setFormInput] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {}
  );
  const viewer = useRef(null);
  const [webviewerInstance, setWebviewerInstance] = useState(null);
  useEffect(() => {
    if (!webviewerInstance) {
      WebViewer(
        {
          showLocalFilePicker: true,
          fullAPI: true,
          path: '/webviewer/lib',
        },
        viewer.current
      ).then((i) => setWebviewerInstance(i));
    }

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
            console.log(res.data.originalDocumentUrl);
            webviewerInstance.loadDocument(res.data.originalDocumentUrl);
            const { docViewer, Annotations } = webviewerInstance;
            const { WidgetFlags } = Annotations;
            const annotManager = docViewer.getAnnotationManager();
            docViewer.on('documentLoaded', async () => {});
            // set flags for required
            const flags = new WidgetFlags();
            flags.set('Required', true);

            // create a form field
            const field = new Annotations.Forms.Field(
              'some signature field name',
              {
                type: 'Sig',
                flags,
              }
            );

            // create a widget annotation
            const widgetAnnot = new Annotations.SignatureWidgetAnnotation(
              field,
              {
                appearance: '_DEFAULT',
                appearances: {
                  _DEFAULT: {
                    Normal: {
                      data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC',
                      offset: {
                        x: 100,
                        y: 100,
                      },
                    },
                  },
                },
              }
            );

            // set position and size
            widgetAnnot.X = 200;
            widgetAnnot.Y = 300;
            widgetAnnot.Width = 200;
            widgetAnnot.Height = 100;

            //add the form field and widget annotation
            annotManager.addAnnotation(widgetAnnot);
            annotManager.drawAnnotationsFromList([widgetAnnot]);
            annotManager.getFieldManager().addField(field);
          } else {
            alert('Document could be signed !');
          }
        })
        .catch(() => {});
    } else if (!instance.defaults.headers.common['Authorization']) {
      history.replace('/');
    }
  }, [id, secret, webviewerInstance]);

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

  const handleSumbit = async (e) => {
    setLoading(true);
    e.preventDefault();
    if (signingDocument) {
      const { docViewer, annotManager } = webviewerInstance;
      const doc = docViewer.getDocument();
      const xfdfString = await annotManager.exportAnnotations();
      const options = { xfdfString };
      const data = await doc.getFileData(options);
      const arr = new Uint8Array(data);
      const blob = new Blob([arr], { type: 'application/pdf' });
      storage
        .ref(`/pdf/${signingDocument.filename}_signed.pdf`)
        .put(blob)
        .on('state_changed', async (res) => {
          const downloadUrl = await res.ref.getDownloadURL();
          instance
            .post('/api/v1/documents/sign', {
              ...signingDocument,
              signedDocumentUrl: downloadUrl,
            })
            .then(() => {
              alert('Sign success');
              history.replace('/document');
            })
            .catch(() => {
              alert('Sign error');
              setLoading(false);
            });
          setLoading(false);
        });
    } else {
      instance
        .post('/api/v1/documents', {
          ...formInput,
          tagSignatureLocations: [
            {
              x: 200,
              y: 300,
              width: 200,
              height: 100,
            },
          ],
        })
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

  const handleChange = async (e) => {
    setLoading(true);
    try {
      let reader = new FileReader();
      let file = e.target.files[0];
      reader.readAsArrayBuffer(file);
      reader.onload = async () => {
        var bytes = new Uint8Array(reader.result); // read the actual file contents
        var blob = new Blob([bytes], { type: 'application/pdf' });
        const docUrl = URL.createObjectURL(blob);
        webviewerInstance.loadDocument(docUrl);
        const { docViewer, Annotations } = webviewerInstance;
        const { WidgetFlags } = Annotations;
        const annotManager = docViewer.getAnnotationManager();
        docViewer.on('documentLoaded', async () => {});
        document.getElementById('myBtn').addEventListener('click', () => {
          // set flags for required
          const flags = new WidgetFlags();
          flags.set('Required', true);

          // create a form field
          const field = new Annotations.Forms.Field(
            'some signature field name',
            {
              type: 'Sig',
              flags,
            }
          );

          // create a widget annotation
          const widgetAnnot = new Annotations.SignatureWidgetAnnotation(field, {
            appearance: '_DEFAULT',
            appearances: {
              _DEFAULT: {
                Normal: {
                  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC',
                  offset: {
                    x: 200,
                    y: 100,
                  },
                },
              },
            },
          });

          // set position and size
          widgetAnnot.PageNumber = 1;
          widgetAnnot.X = 200;
          widgetAnnot.Y = 300;
          widgetAnnot.Width = 200;
          widgetAnnot.Height = 100;

          //add the form field and widget annotation
          annotManager.addAnnotation(widgetAnnot);
          annotManager.drawAnnotationsFromList([widgetAnnot]);
          annotManager.getFieldManager().addField(field);
        });
      };
      storage
        .ref(`/pdf/${file.name}`)
        .put(file)
        .on('state_changed', async (res) => {
          const downloadUrl = await res.ref.getDownloadURL();
          setFormInput({
            filename: file.name.replace('.pdf', ''),
            originalDocumentUrl: downloadUrl,
          });
          setLoading(false);
        });
    } catch (error) {
      setLoading(false);
    }
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
            {!signingDocument && (
              <Button id="myBtn">Tag Signature Location</Button>
            )}
            <div className="webviewer" ref={viewer}></div>
          </Grid>
        </Grid>
      </div>
    </Container>
  );
}
